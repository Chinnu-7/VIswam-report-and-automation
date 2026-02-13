
import StudentReport from './server/models/StudentReport.js';
import sequelize from './server/config/database.js';

async function check() {
    try {
        await sequelize.authenticate();
        const schools = await StudentReport.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('schoolId')), 'schoolId'], 'schoolName', 'assessmentName'],
            raw: true
        });

        console.log('Distinct Schools in DB:', JSON.stringify(schools, null, 2));

        const count = await StudentReport.count();
        console.log(`Total Reports in DB: ${count}`);

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}
check();
