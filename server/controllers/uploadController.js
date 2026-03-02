import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import User from '../models/User.js';
import * as xlsx from 'xlsx';
import { performRecalculate } from './adminController.js';
import path from 'path';
import fs from 'fs';

// Helper to load answer key from file (e.g., SCERT 1.xlsx)
const loadAnswerKey = (qp) => {
    if (!qp) return null;
    const keyFile = path.join(process.cwd(), `${qp}.xlsx`);

    if (!fs.existsSync(keyFile)) {
        console.log(`Answer Key file not found: ${keyFile}`);
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
        // The structure is: 
        // Maths: Col 0 (Subj), Col 1 (Key), Col 2 (Lo)
        // Science: Col 3 (Subj), Col 4 (Key), Col 5 (Lo)
        // English: Col 6 (Subj), Col 7 (Key), Col 8 (Lo)
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
        console.log(`Loaded Answer Key and LOs from ${qp}.xlsx`);
        return key;
    } catch (err) {
        console.error(`Error loading Answer Key from ${qp}.xlsx:`, err);
        return null;
    }
};

// Helper to extract question data (M1-M15, etc.)
const extractSubjectData = (row, prefix, count) => {
    const data = {};
    for (let i = 1; i <= count; i++) {
        const key = `${prefix}${i}`;
        data[key] = row[key] || row[key.toUpperCase()] || 0; // Handle case sensitivity
    }
    return data;
};

export const uploadStudentData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // --- DYNAMIC HEADER MAPPING ---
        const newFormatRow1 = rows[1] ? rows[1].map(h => String(h).toLowerCase().trim().replace(/\s+/g, ' ')) : [];
        const isFinalFormat = newFormatRow1.includes('papercode') || newFormatRow1.includes('student id');

        if (!rows || rows.length < (isFinalFormat ? 2 : 3)) {
            return res.status(400).json({ message: 'Excel file must have headers and at least one student data row.' });
        }

        let headers = [];
        let dataStartIdx = 2;
        let loRowIdx = 1;

        if (isFinalFormat) {
            headers = newFormatRow1;
            loRowIdx = -1; // No LO row
            dataStartIdx = 2;
        } else {
            headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, ' '));
        }

        console.log('Detected Headers:', headers);
        console.log('Is Final Format:', isFinalFormat);

        const getIndex = (possibleHeaders) => {
            return headers.findIndex(h => possibleHeaders.includes(h));
        };

        const idxRollNo = getIndex(['roll no', 'roll number', 'rollno', 'r.no', 'roll_no', 'student id', 'stid']);
        let idxSchoolId = getIndex(['school id', 'school code', 'schoolid', 'school_id']);
        const idxStudentName = isFinalFormat ? idxRollNo : getIndex(['student name', 'name', 'studentname', 'student', 'student_name', 'stname', 'student id']);
        const idxClass = getIndex(['class', 'grade', 'standard', 'std']);
        const idxSchoolName = getIndex(['school name', 'schoolname', 'school']);
        const idxPaperCode = getIndex(['papercode', 'paper code']);

        // Score start indices using loose matching
        let idxMathsStart = -1;
        let idxScienceStart = -1;
        let idxEnglishStart = -1;

        if (isFinalFormat) {
            // New format exact indexes based on string numbers
            idxEnglishStart = headers.indexOf('1');
            idxMathsStart = headers.indexOf('16');
            idxScienceStart = headers.indexOf('31');
        } else {
            idxMathsStart = headers.findIndex(h => h.includes('math') || h.includes('m1') || h === 'q1');
            idxScienceStart = headers.findIndex(h => h.includes('science') || h.includes('s1') || h === 'q16');
            idxEnglishStart = headers.findIndex(h => h.includes('english') || h.includes('e1') || h === 'q31');
        }

        console.log('Detected Indices:', { idxRollNo, idxSchoolId, idxStudentName, idxClass, idxMathsStart, idxScienceStart, idxEnglishStart, idxPaperCode });

        // Critical Column Check
        const finalIdxRollNo = idxRollNo;
        const finalIdxStudentName = idxStudentName;

        if (finalIdxRollNo === -1 || finalIdxStudentName === -1) {
            return res.status(400).json({
                message: `Could not find critical columns (Roll No/Student Id). Please check your Excel headers.`,
                detectedHeaders: headers
            });
        }
        // ------------------------------

        // Row 1 contains the full LO text descriptions (only for old format)
        const loRow = loRowIdx !== -1 ? rows[loRowIdx] : [];

        // Helper to extract LO mapping
        const getLoMapping = (start, count, prefix) => {
            const mapping = {};
            if (start === -1) return mapping;
            for (let i = 0; i < count; i++) {
                const colIdx = start + i;
                const code = `${prefix}${i + 1}`;
                mapping[code] = loRow[colIdx] || `${code} (No Description)`;
            }
            return mapping;
        };

        // Fallback indices if not found (based on known template structure)
        const mStart = idxMathsStart !== -1 ? idxMathsStart : 7;
        const sStart = idxScienceStart !== -1 ? idxScienceStart : 22;
        const eStart = idxEnglishStart !== -1 ? idxEnglishStart : 37;

        const loMapping = {
            maths: getLoMapping(mStart, 15, 'm'),
            science: getLoMapping(sStart, 15, 's'),
            english: getLoMapping(eStart, 15, 'E')
        };

        // EXTRACT METADATA FROM FILENAME AND SHEETNAME
        const fileNameOriginal = req.file.originalname || '';
        const fileNameParts = fileNameOriginal.replace(/\.[^/.]+$/, "").split('_');

        let extractedAssessment = null;
        let extractedSchoolId = null;
        let extractedYear = null;

        if (fileNameParts.length >= 3) {
            extractedAssessment = fileNameParts[0];
            extractedSchoolId = fileNameParts[1];
            extractedYear = fileNameParts[2];
        }

        const extractedGrade = sheetName.replace(/[^\d]/g, '');

        // Fetch School Name from DB if we extracted a school ID
        let dbSchoolName = null;
        if (extractedSchoolId) {
            try {
                const schoolInfo = await SchoolInfo.findOne({ where: { schoolId: extractedSchoolId } });
                if (schoolInfo) {
                    dbSchoolName = schoolInfo.schoolName;
                    console.log(`Matched extracted school ID ${extractedSchoolId} to ${dbSchoolName}`);
                }
            } catch (err) {
                console.error("Error looking up school info:", err);
            }
        }

        // ANSWER KEY LOGIC
        // We will cache keys locally so we don't reload from disk for every student
        const keyCache = {};
        const globalQp = req.body.qp || null;
        let globalAnswerKey = null;

        // Try extracting embedded key from horizontal format first (legacy format check)
        if (!isFinalFormat && getIndex(['q1']) !== -1) {
            const studentRow = rows.find(r => String(r[finalIdxStudentName] || '').trim().toUpperCase() === 'STUDENT');
            if (studentRow) {
                globalAnswerKey = { maths: {}, science: {}, english: {}, loDescriptions: { maths: {}, science: {}, english: {} } };
                for (let j = 0; j < 15; j++) {
                    globalAnswerKey.maths[j + 1] = String(studentRow[mStart + j] || '').trim().toUpperCase();
                    globalAnswerKey.science[j + 1] = String(studentRow[sStart + j] || '').trim().toUpperCase();
                    globalAnswerKey.english[j + 1] = String(studentRow[eStart + j] || '').trim().toUpperCase();
                }
                console.log('Loaded Embedded Answer Key from "STUDENT" row');
            }
        }

        // If no embedded key and we have a global QP (e.g. all students have same paper), pre-load it
        if (!globalAnswerKey && globalQp) {
            globalAnswerKey = loadAnswerKey(globalQp);
            if (globalAnswerKey) {
                keyCache[globalQp] = globalAnswerKey;
            }
        }

        const reportsToCreate = [];
        let skippedRows = 0;

        for (let i = dataStartIdx; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rollNo = String(row[finalIdxRollNo] || '').trim();
            const studentName = String(row[finalIdxStudentName] || '').trim();

            const isKeyRow = studentName.toUpperCase() === 'STUDENT';
            if (isKeyRow) continue; // Already processed as answerKey

            // Allow flexibility if class column missing
            const className = extractedGrade || (idxClass !== -1 ? String(row[idxClass] || '7').trim() : (req.body.grade || '7'));
            const studentQp = isFinalFormat && idxPaperCode !== -1 ? String(row[idxPaperCode] || '').trim() : globalQp;

            if (!rollNo || !studentName) {
                skippedRows++;
                if (skippedRows <= 3) console.log(`Skipping Row ${i + 1}: Missing RollNo or Name`, row);
                continue;
            }

            // Determine Answer Key to use for this student
            let studentAnswerKey = globalAnswerKey;
            if (isFinalFormat && studentQp) {
                if (!keyCache[studentQp]) {
                    const loadedKey = loadAnswerKey(studentQp);
                    if (loadedKey) {
                        keyCache[studentQp] = loadedKey;
                    }
                }
                studentAnswerKey = keyCache[studentQp] || null;
            }

            // --- OVERRIDE LOs FROM EXTERNAL FILE IF AVAILABLE ---
            let studentLoMapping = {
                maths: { ...loMapping.maths },
                science: { ...loMapping.science },
                english: { ...loMapping.english }
            };

            if (studentAnswerKey && studentAnswerKey.loDescriptions) {
                Object.assign(studentLoMapping.maths, studentAnswerKey.loDescriptions.maths);
                Object.assign(studentLoMapping.science, studentAnswerKey.loDescriptions.science);
                Object.assign(studentLoMapping.english, studentAnswerKey.loDescriptions.english);
            }

            // Handle School ID Logic
            let schoolIdVal = '';

            // SECURITY/DATA INTEGRITY: If the user is a principal, ALWAYS use their schoolId
            // This prevents typos in the Excel sheet from detaching students.
            if (req.user && req.user.role === 'principal' && req.user.schoolId) {
                schoolIdVal = req.user.schoolId;
            } else if (extractedSchoolId) {
                schoolIdVal = extractedSchoolId;
            } else if (idxSchoolId !== -1) {
                schoolIdVal = String(row[idxSchoolId] || '').trim();
            } else if (idxSchoolName !== -1) {
                schoolIdVal = String(row[idxSchoolName] || '').trim().toUpperCase();
            } else {
                schoolIdVal = (req.body.schoolName || 'UNKNOWN_SCHOOL').toUpperCase();
            }

            const mapScores = (startIdx, count, prefix, subjectKey) => {
                const scores = {};
                for (let j = 0; j < count; j++) {
                    let val = row[startIdx + j];
                    const qNum = j + 1;

                    // GRADING LOGIC: If answerKey exists, grade the response
                    if (studentAnswerKey && studentAnswerKey[subjectKey] && studentAnswerKey[subjectKey][qNum]) {
                        const correctAns = studentAnswerKey[subjectKey][qNum];
                        const studentAns = String(val || '').trim().toUpperCase();

                        // If student data has A/B/C/D, grade it. If it's already 0/1, keep it.
                        if (['A', 'B', 'C', 'D'].includes(studentAns)) {
                            val = (studentAns === correctAns) ? 1 : 0;
                        }
                    }

                    scores[`${prefix}${qNum}`] = Number(val) || 0;
                }
                return scores;
            };

            const mathsScores = mapScores(mStart, 15, 'm', 'maths');
            const scienceScores = mapScores(sStart, 15, 's', 'science');
            const englishScores = mapScores(eStart, 15, 'E', 'english');

            const calculatePercentage = (scores, totalItems) => {
                const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
                return Math.round((total / totalItems) * 100);
            };

            reportsToCreate.push({
                rollNo,
                studentName,
                schoolId: schoolIdVal,
                schoolName: dbSchoolName || req.body.schoolName || '',
                assessmentName: extractedAssessment || req.body.assessmentName || 'Sodhana 1',
                qp: studentQp || globalQp,
                class: className,
                reportData: {
                    maths: mathsScores,
                    science: scienceScores,
                    english: englishScores,
                    maths_score: calculatePercentage(mathsScores, 15),
                    science_score: calculatePercentage(scienceScores, 15),
                    english_score: calculatePercentage(englishScores, 15),
                    lo_mapping: studentLoMapping
                },
                status: 'PENDING'
            });
        }

        if (reportsToCreate.length === 0) {
            console.log('No reports to create');
            return res.status(400).json({
                message: 'No valid student records found. Checked ' + (rows.length - 2) + ' rows.',
                hint: 'Ensure "Roll No" and "Student Name" columns are present and filled.'
            });
        }

        const finalAssessmentName = reportsToCreate[0].assessmentName;
        const finalQp = reportsToCreate[0].qp || null;

        console.log(`Preparing to delete existing reports for schoolId: ${reportsToCreate[0].schoolId}, assessment: ${finalAssessmentName}`);
        // CLEAR EXISTING DATA
        const deletedCount = await StudentReport.destroy({
            where: {
                schoolId: reportsToCreate[0].schoolId,
                assessmentName: finalAssessmentName,
                qp: finalQp
            }
        });
        console.log(`Deleted ${deletedCount} existing reports.`);

        console.log(`Bulk creating ${reportsToCreate.length} reports...`);
        const createdReports = await StudentReport.bulkCreate(reportsToCreate);
        console.log(`Successfully created ${createdReports.length} reports in DB.`);

        // TRIGGER AUTOMATIC RECALCULATION
        try {
            await performRecalculate(reportsToCreate[0].schoolId, finalAssessmentName, finalQp);
        } catch (err) {
            console.error('Auto-recalculate failed during upload:', err);
        }

        res.json({ message: `Successfully uploaded ${reportsToCreate.length} reports and computed relative grades.` });

    } catch (error) {
        console.error('CRITICAL: Error in uploadStudentData:', error);
        res.status(500).json({
            message: 'Server processing error during upload',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const uploadSchoolData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const schoolsToUpsert = [];

        for (const row of data) {
            const schoolId = row['School Id'] || row['SCHOOL ID'] || row['ID'];
            const email = row['Principal Email'] || row['Email'] || row['EMAIL'];
            const name = row['School Name'] || row['SCHOOL NAME'] || row['NAME'];
            const whatsapp = row['WhatsApp'] || row['WhatsApp No'] || row['WHATSAPP'];

            if (schoolId && email) {
                schoolsToUpsert.push({
                    schoolId,
                    principalEmail: email,
                    schoolName: name,
                    whatsappNo: whatsapp
                });
            }
        }

        // Upsert (update if exists)
        await SchoolInfo.bulkCreate(schoolsToUpsert, {
            updateOnDuplicate: ['principalEmail', 'schoolName', 'whatsappNo']
        });

        // Create/Update User Accounts for Principals
        for (const school of schoolsToUpsert) {
            const existingUser = await User.findOne({ where: { email: school.principalEmail } });
            if (!existingUser) {
                await User.create({
                    email: school.principalEmail,
                    password: `${school.schoolId}@123`, // Default password
                    role: 'principal',
                    schoolId: school.schoolId
                });
            } else {
                // Update schoolId if email exists
                existingUser.schoolId = school.schoolId;
                await existingUser.save();
            }
        }

        res.json({
            message: `Successfully processed ${schoolsToUpsert.length} schools and created/updated principal accounts.`
        });

    } catch (error) {
        console.error('Error uploading school data:', error);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
};
