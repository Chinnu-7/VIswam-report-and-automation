import StudentReport from './server/models/StudentReport.js';
import sequelize from './server/config/database.js';

async function verify() {
    try {
        await sequelize.authenticate();
        const count = await StudentReport.count();
        const reports = await StudentReport.findAll({ limit: 5 });
        console.log('--- DATABASE VERIFICATION ---');
        console.log(`Total Reports: ${count}`);
        console.log('Sample Reports:', JSON.stringify(reports, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}
verify();
