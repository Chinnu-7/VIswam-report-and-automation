import xlsx from 'xlsx';
import path from 'path';

const filePath = 'c:/Users/Admin/Desktop/Viswam Data and Automation/Viswam Report card/Vignyan Rough.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log("Row 0 (Codes):", rows[0].slice(0, 10));
    console.log("Row 1 (LO Text):", rows[1].slice(0, 10));
    console.log("Row 2 (First Student):", rows[2].slice(0, 10));

    // Check Science and English start indices
    console.log("Science LO (Col 22):", rows[1][22]);
    console.log("English LO (Col 37):", rows[1][37]);

} catch (err) {
    console.error(err);
}
