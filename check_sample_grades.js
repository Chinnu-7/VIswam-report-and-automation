import StudentReport from './server/models/StudentReport.js';
import sequelize from './server/config/database.js';

async function checkGrades() {
    try {
        await sequelize.authenticate();
        const reports = await StudentReport.findAll({
            limit: 5
        });

        reports.forEach(r => {
            console.log(`Student: ${r.studentName}, Overall Grade: ${r.reportData.relative_grading?.overall?.grade}`);
            console.log(`Maths Grade: ${r.reportData.relative_grading?.maths?.grade}`);
            console.log(`Science Grade: ${r.reportData.relative_grading?.science?.grade}`);
            console.log(`English Grade: ${r.reportData.relative_grading?.english?.grade}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}
checkGrades();
