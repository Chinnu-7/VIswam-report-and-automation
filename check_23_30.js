import xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'd:/Viswam Report card/Smart Kennededy.xlsx';
if (fs.existsSync(filePath)) {
    const workbook = xlsx.read(fs.readFileSync(filePath));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const s23 = data.find(row => String(row[0]) === '23');
    const s30 = data.find(row => String(row[0]) === '30');

    if (s23) {
        console.log('Student 23 Name:', s23[1]);
        const m = s23.slice(4, 19).filter(x => x == 1).length;
        const s = s23.slice(19, 34).filter(x => x == 1).length;
        const e = s23.slice(34, 49).filter(x => x == 1).length;
        console.log(`Math: ${m}/15, Science: ${s}/15, English: ${e}/15`);
    } else {
        console.log('Student 23 not found');
    }

    if (s30) {
        console.log('Student 30 Name:', s30[1]);
        const m = s30.slice(4, 19).filter(x => x == 1).length;
        const s = s30.slice(19, 34).filter(x => x == 1).length;
        const e = s30.slice(34, 49).filter(x => x == 1).length;
        console.log(`Math: ${m}/15, Science: ${s}/15, English: ${e}/15`);
    } else {
        console.log('Student 30 not found');
    }
}
