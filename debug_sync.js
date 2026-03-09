import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const { default: sequelize } = await import('./server/config/database.js');
const { default: SchoolInfo } = await import('./server/models/SchoolInfo.js');

async function syncDebugger() {
    try {
        console.log('Fetching CSV from Google Sheets...');
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRb2tmmwhgc0qPTeP-ivAIMtNak3bet9bFL_6xqgvjnHH5XnWr5l-6JiF9MsFqiiISUQrxh4wueTXaS/pub?output=csv';
        const response = await axios.get(csvUrl);
        const rows = response.data.split('\n').map(row => row.split(','));
        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Map column indices
        const idIdx = headers.findIndex(h => h.includes('NSF User ID'));
        const nameIdx = headers.findIndex(h => h.includes('School Name'));
        const districtIdx = headers.findIndex(h => h.includes('District'));
        const emailIdx = headers.findIndex(h => h.includes('School Email Id'));

        console.log(`CSV Headers: ${headers.join(' | ')}`);
        console.log(`Index - ID: ${idIdx}, Name: ${nameIdx}, Email: ${emailIdx}`);

        const csvSchools = dataRows.map(r => ({
            schoolId: r[idIdx]?.trim(),
            schoolName: r[nameIdx]?.trim(),
            email: r[emailIdx]?.trim()
        })).filter(s => s.schoolId && s.schoolId.length > 0);

        console.log(`Found ${csvSchools.length} valid school rows in CSV.`);

        console.log('Connecting to RDS...');
        await sequelize.authenticate();

        const dbSchools = await SchoolInfo.findAll({ attributes: ['schoolId', 'schoolName'] });
        const dbIds = new Set(dbSchools.map(s => s.schoolId));

        console.log(`DB has ${dbIds.size} unique schools.`);

        const missing = csvSchools.filter(s => !dbIds.has(s.schoolId));
        console.log(`\n❌ MISSING FROM DB (${missing.length}):`);
        missing.slice(0, 10).forEach(m => console.log(` - ID: ${m.schoolId} | Name: ${m.schoolName}`));
        if (missing.length > 10) console.log(' ... and more');

        const duplicates = {};
        csvSchools.forEach(s => {
            duplicates[s.schoolId] = (duplicates[s.schoolId] || 0) + 1;
        });
        const dupIds = Object.entries(duplicates).filter(([id, count]) => count > 1);
        if (dupIds.length > 0) {
            console.log(`\n⚠️ DUPLICATES IN CSV (${dupIds.length}):`);
            dupIds.forEach(([id, count]) => console.log(` - ID: ${id} appears ${count} times`));
        }

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic failed:', err);
        process.exit(1);
    }
}

syncDebugger();
