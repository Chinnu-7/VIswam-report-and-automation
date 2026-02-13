
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const filePath = "c:\\Users\\Admin\\Desktop\\Viswam Data and Automation\\Viswam Report card\\Smart Kennededy.xlsx";

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length > 2) {
        let nonBinary = [];
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            for (let j = 4; j < 49; j++) {
                const val = row[j];
                if (val !== null && val !== undefined && val !== 0 && val !== 1 && val !== "0" && val !== "1") {
                    nonBinary.push({ row: i + 1, col: j, val });
                }
            }
        }
        console.log(`Non-binary values found: ${nonBinary.length}`);
        if (nonBinary.length > 0) {
            console.log('Sample non-binary values:', nonBinary.slice(0, 10));
        }
    }

} catch (err) {
    console.error("Error reading file:", err);
}
