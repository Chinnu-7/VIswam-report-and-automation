
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

// Mock request body
const filePath = "c:\\Users\\Admin\\Desktop\\Viswam Data and Automation\\Viswam Report card\\Spring Vally.xlsx";

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Loaded file: ${filePath}`);
    console.log(`Total rows: ${rows.length}`);

    if (rows.length > 0) {
        // --- DYNAMIC HEADER MAPPING REPLICATION ---
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        console.log("Headers found:", headers);

        const getIndex = (possibleHeaders) => {
            return headers.findIndex(h => possibleHeaders.includes(h));
        };

        const idxRollNo = getIndex(['roll no', 'roll number', 'rollno', 'r.no']);
        const idxSchoolId = getIndex(['school id', 'school code', 'schoolid']);
        const idxStudentName = getIndex(['student name', 'name', 'studentname', 'student']);
        const idxClass = getIndex(['class', 'grade', 'standard', 'std']);

        // Score start indices (assuming M1, S1, E1 exist as headers)
        const idxMathsStart = headers.findIndex(h => h.startsWith('m1') || h === 'maths1' || h === 'maths 1');
        const idxScienceStart = headers.findIndex(h => h.startsWith('s1') || h === 'science1' || h === 'science 1');
        const idxEnglishStart = headers.findIndex(h => h.startsWith('e1') || h === 'english1' || h === 'english 1');

        console.log("\n--- DETECTED INDICES ---");
        console.log(`Roll No Index: ${idxRollNo}`);
        console.log(`School ID Index: ${idxSchoolId}`);
        console.log(`Student Name Index: ${idxStudentName}`);
        console.log(`Class Index: ${idxClass}`);
        console.log(`Maths Start Index: ${idxMathsStart}`);
        console.log(`Science Start Index: ${idxScienceStart}`);
        console.log(`English Start Index: ${idxEnglishStart}`);

        console.log("\n--- SAMPLE DATA EXTRACTION (Row 3, Index 2) ---");
        if (rows.length > 2) {
            const row = rows[2];
            const studentName = String(row[idxStudentName !== -1 ? idxStudentName : 2] || '').trim();
            const rollNo = String(row[idxRollNo !== -1 ? idxRollNo : 0] || '').trim();
            const className = String(row[idxClass !== -1 ? idxClass : 3] || '').trim();

            console.log(`Extracted Name: "${studentName}"`);
            console.log(`Extracted Roll No: "${rollNo}"`);
            console.log(`Extracted Class: "${className}"`);

            // Verify Scores
            const mStart = idxMathsStart !== -1 ? idxMathsStart : 7;
            const mathsVal = row[mStart];
            console.log(`Sample Math Score (M1): ${mathsVal} (at index ${mStart})`);
        } else {
            console.log("Not enough rows to sample data.");
        }
    } else {
        console.log("File is empty.");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
