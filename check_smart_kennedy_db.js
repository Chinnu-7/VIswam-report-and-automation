
import StudentReport from './server/models/StudentReport.js';
import sequelize from './server/config/database.js';

async function check() {
    try {
        await sequelize.authenticate();
        const reports = await StudentReport.findAll({
            where: { schoolId: '610' }
        });

        console.log(`Reports for School 610: ${reports.length}`);

        if (reports.length > 0) {
            // Check cohort stats stored in the first report
            const firstReport = reports[0].reportData;
            console.log('Cohort Stats in DB:', JSON.stringify(firstReport.cohort_stats, null, 2));

            // Calculate averages from individual student scores in DB
            let mSum = 0, sSum = 0, eSum = 0;
            reports.forEach(r => {
                mSum += r.reportData.maths_score || 0;
                sSum += r.reportData.science_score || 0;
                eSum += r.reportData.english_score || 0;
            });

            console.log(`DB Averages:`);
            console.log(`Maths: ${(mSum / reports.length).toFixed(2)}%`);
            console.log(`Science: ${(sSum / reports.length).toFixed(2)}%`);
            console.log(`English: ${(eSum / reports.length).toFixed(2)}%`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}
check();
