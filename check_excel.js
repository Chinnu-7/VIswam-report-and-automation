import xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'd:/Viswam Report card/Smart Kennededy.xlsx';
if (fs.existsSync(filePath)) {
    const workbook = xlsx.read(fs.readFileSync(filePath));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Total Rows:', data.length);

    // Headers are row 0, LO descriptions row 1. Students start at index 2.
    const students = data.slice(2).filter(row => row[1] || row[2]);
    console.log('Valid Students Count:', students.length);

    // Try to find roll no in column 2 (index 1) or name in column 3 (index 2)
    const s23 = students.find(row => String(row[1]) === '23' || String(row[2]).includes('KRISHNAN'));
    const s30 = students.find(row => String(row[1]) === '30' || String(row[2]).includes('VIRUPA'));

    if (s23) {
        console.log('Student 23 Name:', s23[2]);
        console.log('Student 23 Row Data:', JSON.stringify(s23));
    }
    if (s30) {
        console.log('Student 30 Name:', s30[2]);
        console.log('Student 30 Row Data:', JSON.stringify(s30));
    }
} else {
    console.log('File not found');
}
