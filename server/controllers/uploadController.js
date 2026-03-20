import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import User from '../models/User.js';
import * as xlsx from 'xlsx';
import { Op } from 'sequelize';
import { performRecalculate, performSchoolSync, updateSchoolsBatch } from './adminController.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load answer key from file (e.g., SCERT 1.xlsx)
const loadAnswerKey = (qp) => {
    if (!qp) return null;

    // Try multiple possible paths for Vercel serverless compatibility
    const possiblePaths = [
        path.resolve(__dirname, '../../', `${qp}.xlsx`),        // Relative to controller
        path.resolve(process.cwd(), `${qp}.xlsx`),              // Relative to cwd
        path.resolve('/var/task', `${qp}.xlsx`),                // Vercel Lambda root
        path.resolve('/var/task/user', `${qp}.xlsx`),           // Vercel user dir
    ];

    let keyFile = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            keyFile = p;
            console.log(`Answer Key found at: ${p}`);
            break;
        }
    }

    if (!keyFile) {
        console.error(`Answer Key file NOT FOUND for QP "${qp}". Tried paths:`);
        possiblePaths.forEach(p => console.error(`  - ${p} (exists: ${fs.existsSync(p)})`));
        // Also log what files exist in likely directories
        try {
            const cwdFiles = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.xlsx'));
            console.log(`Files in cwd (${process.cwd()}):`, cwdFiles);
        } catch (e) { console.log('Could not list cwd:', e.message); }
        try {
            const dirFiles = fs.readdirSync(path.resolve(__dirname, '../../')).filter(f => f.endsWith('.xlsx'));
            console.log(`Files in __dirname/../../ (${path.resolve(__dirname, '../../')}):`, dirFiles);
        } catch (e) { console.log('Could not list __dirname/../../:', e.message); }
        return null;
    }

    try {
        const workbook = xlsx.read(fs.readFileSync(keyFile), { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const key = {
            maths: {},
            science: {},
            english: {},
            loDescriptions: { maths: {}, science: {}, english: {} }
        };

        // Row 0 is header. Data starts from Row 1 to Row 15.
        for (let i = 1; i <= 15; i++) {
            const row = rows[i];
            if (row) {
                // Maths
                key.maths[i] = String(row[1] || '').trim().toUpperCase();
                key.loDescriptions.maths[`m${i}`] = String(row[2] || '').trim();

                // Science
                key.science[i] = String(row[4] || '').trim().toUpperCase();
                key.loDescriptions.science[`s${i}`] = String(row[5] || '').trim();

                // English
                key.english[i] = String(row[7] || '').trim().toUpperCase();
                key.loDescriptions.english[`E${i}`] = String(row[8] || '').trim();
            }
        }
        return key;
    } catch (err) {
        console.error(`Error loading Answer Key from ${keyFile}:`, err);
        return null;
    }
};

export const uploadStudentData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { assessmentName, qp: globalQp, force, schoolName } = req.body;
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        const allReportsToCreate = [];
        const sheetResults = [];
        const duplicateGrades = [];

        // 1. PRE-CHECK FOR DUPLICATES
        if (force !== 'true') {
            for (const sheetName of workbook.SheetNames) {
                const grade = sheetName.replace(/[^\d]/g, '').slice(0, 1) || '7';
                const existing = await StudentReport.count({
                    where: {
                        schoolName: schoolName || '',
                        assessmentName: assessmentName || '',
                        class: grade
                    }
                });
                if (existing > 0) duplicateGrades.push(grade);
            }

            if (duplicateGrades.length > 0) {
                return res.status(409).json({
                    message: `Data already exists for Grades: ${duplicateGrades.join(', ')}.`,
                    grades: duplicateGrades,
                    needsConfirmation: true
                });
            }
        }

        // 2. PROCESS EACH SHEET
        let actualSchoolId = req.body.schoolId;

        // If schoolId wasn't passed, try to look it up (Case Insensitive or by ID prefix)
        if (!actualSchoolId && schoolName) {
            const cleanName = schoolName.trim();

            // Check if it's the "ID: 12345" format from our filename auto-parser
            if (cleanName.startsWith('ID: ')) {
                actualSchoolId = cleanName.replace('ID: ', '').trim();
            } else {
                const schoolRecord = await SchoolInfo.findOne({
                    where: { schoolName: { [Op.like]: cleanName } }
                });
                if (schoolRecord) {
                    actualSchoolId = schoolRecord.schoolId;
                } else {
                    return res.status(400).json({
                        message: `Cannot find School ID for school: "${cleanName}". Please sync schools or select a valid school name exactly as it appears in the Google Sheet.`
                    });
                }
            }
        }

        if (!actualSchoolId) {
            return res.status(400).json({ message: 'A valid School ID is required.' });
        }

        // Verify school exists in DB to prevent Foreign Key violations
        console.log(`[Upload] Verifying existence of schoolId: "${actualSchoolId}"`);
        let schoolExists = await SchoolInfo.findByPk(actualSchoolId);
        
        if (!schoolExists) {
            console.log(`[Upload] School ID "${actualSchoolId}" NOT FOUND. Attempting Auto-Sync...`);
            try {
                const rawSchools = await performSchoolSync();
                // We need a mock req/res for updateSchoolsBatch or just call the logic
                // Since updateSchoolsBatch is exported, let's use it by mocking the response
                const mockRes = { json: (data) => data, status: () => ({ json: (data) => data }) };
                await updateSchoolsBatch({ body: { schools: rawSchools } }, mockRes);
                
                // Retry lookup
                schoolExists = await SchoolInfo.findByPk(actualSchoolId);
            } catch (syncErr) {
                console.error('[Upload] Auto-Sync failed:', syncErr.message);
            }
        }

        if (!schoolExists) {
            console.log(`[Upload] School ID "${actualSchoolId}" STILL NOT FOUND. Returning 404.`);
            return res.status(404).json({
                message: `School with ID "${actualSchoolId}" not found in database. Please ensure it exists in the Google Sheet and try again.`,
                schoolId: actualSchoolId
            });
        }
        console.log(`[Upload] School Verified: ${schoolExists.schoolName}`);

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            const extractedGrade = sheetName.replace(/[^\d]/g, '') || '7';

            const firstRowHeaders = rows[0] ? rows[0].map(h => String(h).toLowerCase().trim()) : [];
            const secondRowHeaders = rows[1] ? rows[1].map(h => String(h).toLowerCase().trim()) : [];
            const isFinalFormat = secondRowHeaders.includes('papercode') || secondRowHeaders.includes('student id');

            let headers = isFinalFormat ? secondRowHeaders : firstRowHeaders;
            let dataStartIdx = isFinalFormat ? 2 : 1;

            const getIndex = (possible) => headers.findIndex(h => possible.includes(h));
            const idxRollNo = getIndex(['roll no', 'student id', 'stid', 'rollno', 'r.no']);
            const idxName = getIndex(['student name', 'name', 'studentname', 'stname']);
            const idxQp = getIndex(['papercode', 'paper code', 'qp']);

            if (idxRollNo === -1) {
                console.log(`[Upload] Skipping sheet ${sheetName}: No Roll No/Student ID column found among headers:`, headers);
                continue;
            }

            const mStart = headers.findIndex(h => h === '16' || h === 'm1' || h === 'q16' || h.includes('maths 1') || h.includes('maths q1'));
            const sStart = headers.findIndex(h => h === '31' || h === 's1' || h === 'q31' || h.includes('science 1') || h.includes('science q1'));
            const eStart = headers.findIndex(h => h === '1' || h === 'e1' || h === 'q1' || h.includes('english 1') || h.includes('english q1'));

            console.log(`[Upload] Sheet: ${sheetName}, RollsIdx: ${idxRollNo}, QpIdx: ${idxQp}, E:${eStart}, M:${mStart}, S:${sStart}`);

            if (eStart === -1 && mStart === -1 && sStart === -1) {
                console.log(`[Upload] Skipping sheet ${sheetName}: Could not find subject start columns (1, 16, 31)`);
                continue;
            }

            const keyCache = {};
            const sheetReports = [];

            for (let i = dataStartIdx; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;
                if (!row[idxRollNo]) {
                    console.log(`[Upload] Row ${i}: Skipped missing roll no`);
                    continue;
                }

                const rollNo = String(row[idxRollNo]).trim();
                const studentName = String(row[idxName] || `Student ${rollNo}`).trim();

                let rawQp = String(row[idxQp] || globalQp || '').trim().toUpperCase();
                let studentQp = '';

                // Robust mapping for numeric and string PaperCodes
                if (rawQp === '1' || rawQp.includes('SCERT1') || rawQp === 'SCERT 1') studentQp = 'SCERT 1';
                else if (rawQp === '2' || rawQp.includes('SCERT2') || rawQp === 'SCERT 2') studentQp = 'SCERT 2';
                else if (rawQp === '3' || rawQp.includes('NCERT1') || rawQp === 'NCERT 1') studentQp = 'NCERT 1';
                else if (rawQp === '4' || rawQp.includes('NCERT2') || rawQp === 'NCERT 2') studentQp = 'NCERT 2';
                else studentQp = rawQp || 'SCERT 1'; // Default to SCERT 1 if empty

                console.log(`[Upload] Row ${i} (Roll: ${rollNo}): RawQP="${rawQp}", MappedQP="${studentQp}"`);

                if (!keyCache[studentQp]) {
                    console.log(`[Upload] Loading Answer Key for: ${studentQp}`);
                    keyCache[studentQp] = loadAnswerKey(studentQp);
                }
                const key = keyCache[studentQp];
                if (!key) {
                    console.log(`[Upload] Row ${i} (Roll: ${rollNo}): Skipped, Answer key NOT FOUND for ${studentQp}`);
                    continue;
                }
                if (!key) continue;

                const mapScores = (startIdx, count, subjKey) => {
                    const scores = {};
                    const prefix = subjKey === 'maths' ? 'm' : (subjKey === 'science' ? 's' : 'E');
                    for (let q = 1; q <= count; q++) {
                        const cellVal = String(row[startIdx + q - 1] || '').trim().toUpperCase();
                        const correctVal = key[subjKey][q];
                        scores[`${prefix}${q}`] = cellVal === correctVal ? 1 : 0;
                    }
                    return scores;
                };

                const calcPct = (scores) => {
                    const total = Object.values(scores).reduce((a, b) => a + b, 0);
                    return Math.round((total / 15) * 100);
                };

                const mScores = mapScores(mStart, 15, 'maths');
                const sScores = mapScores(sStart, 15, 'science');
                const eScores = mapScores(eStart, 15, 'english');

                sheetReports.push({
                    rollNo,
                    studentName,
                    schoolId: actualSchoolId,
                    schoolName: schoolExists.schoolName,
                    assessmentName: assessmentName || 'Sodhana 1',
                    qp: studentQp,
                    class: extractedGrade,
                    reportData: {
                        maths: mScores,
                        science: sScores,
                        english: eScores,
                        maths_score: calcPct(mScores),
                        science_score: calcPct(sScores),
                        english_score: calcPct(eScores),
                        lo_mapping: key.loDescriptions
                    },
                    status: 'PENDING'
                });
            }

            if (sheetReports.length > 0) {
                await StudentReport.destroy({
                    where: {
                        schoolId: actualSchoolId,
                        assessmentName: assessmentName || 'Sodhana 1',
                        class: extractedGrade
                    }
                });
                allReportsToCreate.push(...sheetReports);
                sheetResults.push({ grade: extractedGrade, count: sheetReports.length });
            }
        }

        if (allReportsToCreate.length === 0) {
            return res.status(400).json({ message: 'No valid student records found.' });
        }

        console.log(`[Upload] Inserting ${allReportsToCreate.length} reports into database...`);
        try {
            await StudentReport.bulkCreate(allReportsToCreate);
        } catch (bulkErr) {
            console.error('[Upload] bulkCreate failed:', bulkErr);
            let detail = bulkErr.message;
            if (bulkErr.errors && Array.isArray(bulkErr.errors)) {
                detail = bulkErr.errors.map(e => `${e.path}: ${e.message}`).join(', ');
            }
            throw new Error(`Database insert failed: ${detail}`);
        }
        
        console.log(`[Upload] Recalculating cohort stats for school: ${actualSchoolId}`);
        await performRecalculate(actualSchoolId, assessmentName || 'Sodhana 1');

        res.json({
            message: `Successfully uploaded ${allReportsToCreate.length} students across ${sheetResults.length} grades.`,
            details: sheetResults
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Error processing upload', error: error.message });
    }
};

export const uploadSchoolData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        const schoolsToUpsert = [];

        for (const row of data) {
            const schoolId = row['School Id'] || row['SCHOOL ID'] || row['ID'];
            const email = row['Principal Email'] || row['Email'] || row['EMAIL'];
            const name = row['School Name'] || row['SCHOOL NAME'] || row['NAME'];
            const whatsapp = row['WhatsApp'] || row['WhatsApp No'] || row['WHATSAPP'];
            const state = row['State'] || row['STATE'] || '';
            const district = row['District'] || row['DISTRICT'] || '';

            if (schoolId && email) {
                schoolsToUpsert.push({ 
                    schoolId, 
                    principalEmail: email, 
                    schoolName: name, 
                    whatsappNo: whatsapp, 
                    state, 
                    district 
                });
            }
        }

        await SchoolInfo.bulkCreate(schoolsToUpsert, { 
            updateOnDuplicate: ['principalEmail', 'schoolName', 'whatsappNo', 'state', 'district'] 
        });

        for (const school of schoolsToUpsert) {
            const existingUser = await User.findOne({ where: { email: school.principalEmail } });
            if (!existingUser) {
                await User.create({
                    email: school.principalEmail,
                    password: `${school.schoolId}@123`,
                    role: 'principal',
                    schoolId: school.schoolId
                });
            } else {
                existingUser.schoolId = school.schoolId;
                await existingUser.save();
            }
        }
        res.json({ message: `Successfully processed ${schoolsToUpsert.length} schools.` });
    } catch (error) {
        console.error('Error uploading school data:', error);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
};
