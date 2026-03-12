import * as xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'd:/Viswam Report card/Sodhan1_572834_2025-2026.xls';

function parseFile() {
  try {
    const workbook = xlsx.read(fs.readFileSync(filePath), { type: 'buffer' });
    console.log("Sheets:", workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\nSheet: ${sheetName}`);
      console.log("Header Row 0:", rows[0]);
      console.log("Header Row 1:", rows[1]);
      console.log("Data Row 2:", rows[2]);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

parseFile();
