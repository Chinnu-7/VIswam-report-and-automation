import xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'd:/Viswam Report card/Smart Kennededy.xlsx';
if (fs.existsSync(filePath)) {
    const workbook = xlsx.read(fs.readFileSync(filePath));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Headers (Row 0):', JSON.stringify(data[0]));
    console.log('LO Row (Row 1):', JSON.stringify(data[1]));
    console.log('Sample Data (Row 2):', JSON.stringify(data[2]));
    console.log('Sample Data (Row 23):', JSON.stringify(data[23]));
    console.log('Sample Data (Row 24):', JSON.stringify(data[24]));
}
