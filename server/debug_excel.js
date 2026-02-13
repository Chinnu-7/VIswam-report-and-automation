import xlsx from 'xlsx';

const files = [
    'c:/Users/NSF/OneDrive/Desktop/Viswam.xlsx',
    'c:/Users/NSF/OneDrive/Desktop/Pricipal data.xlsx',
    'c:/Users/NSF/OneDrive/Desktop/Vignyan Rough.xlsx'
];

files.forEach(file => {
    try {
        console.log(`\n--- Reading ${file} ---`);
        const workbook = xlsx.readFile(file);
        console.log('Sheet Names:', workbook.SheetNames);

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Read as array of arrays to see raw structure (header: 1)
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length > 0) {
            console.log('First 5 Rows:');
            console.log(JSON.stringify(data.slice(0, 5), null, 2));
        } else {
            console.log('Sheet is empty');
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});
