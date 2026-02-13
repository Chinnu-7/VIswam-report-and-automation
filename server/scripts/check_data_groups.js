
import sequelize from '../config/database.js';
import StudentReport from '../models/StudentReport.js';

const checkGroups = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const reports = await StudentReport.findAll({
            attributes: ['id', 'schoolId', 'assessmentName', 'studentName']
        });

        const groups = {};
        reports.forEach(r => {
            const key = `${r.schoolId} | ${r.assessmentName}`;
            if (!groups[key]) groups[key] = 0;
            groups[key]++;
        });

        console.log('--- DATA GROUPS ---');
        console.table(groups);

        console.log('--- SAMPLE IDs ---');
        reports.slice(0, 3).forEach(r => console.log(`${r.id}: ${r.schoolId} - ${r.assessmentName} (${r.studentName})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkGroups();
