import xlsx from 'xlsx';
import fs from 'fs';

async function checkExcel(file) {
    try {
        console.log(`Reading ${file}...`);
        const buf = fs.readFileSync(file);
        const workbook = xlsx.read(buf, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        console.log(`Found ${data.length} rows.`);
        if (data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        }
    } catch (err) {
        console.error(`Failed to read ${file}:`, err.message);
    }
}

checkExcel('NCERT 3.xlsx');
checkExcel('NCERT 4.xlsx');
