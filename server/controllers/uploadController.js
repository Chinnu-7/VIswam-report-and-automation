import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import User from '../models/User.js';
import * as xlsx from 'xlsx';
import { performRecalculate } from './adminController.js';

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

        if (!rows || rows.length < 3) {
            return res.status(400).json({ message: 'Excel file must have header row (1), LO text row (2), and at least one student data row (3+).' });
        }

        // --- DYNAMIC HEADER MAPPING ---
        // Normalize headers to handle case/trimming issues
        const headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, ' '));
        console.log('Detected Headers:', headers);

        const getIndex = (possibleHeaders) => {
            return headers.findIndex(h => possibleHeaders.includes(h));
        };

        const idxRollNo = getIndex(['roll no', 'roll number', 'rollno', 'r.no', 'roll_no']);
        let idxSchoolId = getIndex(['school id', 'school code', 'schoolid', 'school_id']);
        const idxStudentName = getIndex(['student name', 'name', 'studentname', 'student', 'student_name']);
        const idxClass = getIndex(['class', 'grade', 'standard', 'std']);
        const idxSchoolName = getIndex(['school name', 'schoolname', 'school']);

        // Score start indices using loose matching
        const idxMathsStart = headers.findIndex(h => h.includes('math') || h.includes('m1'));
        const idxScienceStart = headers.findIndex(h => h.includes('science') || h.includes('s1'));
        const idxEnglishStart = headers.findIndex(h => h.includes('english') || h.includes('e1'));

        console.log('Detected Indices:', { idxRollNo, idxSchoolId, idxStudentName, idxClass, idxMathsStart, idxScienceStart, idxEnglishStart });

        // Critical Column Check
        const missingColumns = [];
        if (idxRollNo === -1) missingColumns.push('Roll No');
        if (idxStudentName === -1) missingColumns.push('Student Name');

        if (missingColumns.length > 0) {
            return res.status(400).json({
                message: `Could not find critical columns: ${missingColumns.join(', ')}. Please check your Excel headers to ensure they are correct.`,
                detectedHeaders: headers
            });
        }
        // ------------------------------

        // Row 1 contains the full LO text descriptions
        const loRow = rows[1];

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
            maths: getLoMapping(mStart, 15, 'M'),
            science: getLoMapping(sStart, 15, 'S'),
            english: getLoMapping(eStart, 15, 'E')
        };

        const reportsToCreate = [];
        const { assessmentName, schoolName } = req.body;
        let skippedRows = 0;

        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rollNo = String(row[idxRollNo] || '').trim();
            const studentName = String(row[idxStudentName] || '').trim();

            // Allow flexibility if class column missing
            const className = idxClass !== -1 ? String(row[idxClass] || '7').trim() : (req.body.grade || '7');

            if (!rollNo || !studentName) {
                skippedRows++;
                if (skippedRows <= 3) console.log(`Skipping Row ${i + 1}: Missing RollNo or Name`, row);
                continue;
            }

            // Handle School ID Logic
            let schoolIdVal = '';
            if (idxSchoolId !== -1) {
                schoolIdVal = String(row[idxSchoolId] || '').trim();
            } else if (idxSchoolName !== -1) {
                schoolIdVal = String(row[idxSchoolName] || '').trim().toUpperCase();
            } else {
                schoolIdVal = (schoolName || 'UNKNOWN_SCHOOL').toUpperCase();
            }

            const mapScores = (startIdx, count, prefix) => {
                const scores = {};
                for (let j = 0; j < count; j++) {
                    const val = row[startIdx + j];
                    scores[`${prefix}${j + 1}`] = Number(val) || 0;
                }
                return scores;
            };

            const mathsScores = mapScores(mStart, 15, 'M');
            const scienceScores = mapScores(sStart, 15, 'S');
            const englishScores = mapScores(eStart, 15, 'E');

            const calculatePercentage = (scores, totalItems) => {
                const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
                return Math.round((total / totalItems) * 100);
            };

            reportsToCreate.push({
                rollNo,
                studentName,
                schoolId: schoolIdVal,
                schoolName,
                assessmentName,
                class: className,
                reportData: {
                    maths: mathsScores,
                    science: scienceScores,
                    english: englishScores,
                    maths_score: calculatePercentage(mathsScores, 15),
                    science_score: calculatePercentage(scienceScores, 15),
                    english_score: calculatePercentage(englishScores, 15),
                    lo_mapping: loMapping
                },
                status: 'PENDING'
            });
        }

        if (reportsToCreate.length === 0) {
            return res.status(400).json({
                message: 'No valid student records found. Checked ' + (rows.length - 2) + ' rows.',
                hint: 'Ensure "Roll No" and "Student Name" columns are present and filled.'
            });
        }

        // CLEAR EXISTING DATA
        await StudentReport.destroy({
            where: {
                schoolId: reportsToCreate[0].schoolId,
                assessmentName: assessmentName
            }
        });

        await StudentReport.bulkCreate(reportsToCreate);

        // TRIGGER AUTOMATIC RECALCULATION
        try {
            await performRecalculate(reportsToCreate[0].schoolId, assessmentName);
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
            const schoolId = row['School Id'] || row['SCHOOL ID']; // Adjust based on actual header
            const email = row['Principal Email'] || row['Email'] || row['EMAIL'];
            const name = row['School Name'] || row['SCHOOL NAME'];

            if (schoolId && email) {
                schoolsToUpsert.push({
                    schoolId,
                    principalEmail: email,
                    schoolName: name
                });
            }
        }

        // Upsert (update if exists)
        await SchoolInfo.bulkCreate(schoolsToUpsert, {
            updateOnDuplicate: ['principalEmail', 'schoolName']
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
