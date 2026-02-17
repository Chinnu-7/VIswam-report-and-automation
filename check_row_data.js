import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const filePath = "Smart Kennededy.xlsx";

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length > 2) {
        console.log('Row 3 (First Student Data):', rows[2]);
    }
} catch (err) {
    console.error("Error reading file:", err);
}
