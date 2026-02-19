
import StudentReport from './server/models/StudentReport.js';
import sequelize from './server/config/database.js';
import { Op } from 'sequelize';

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Search for Rainbow Concept (flexible matching)
        const students = await StudentReport.findAll({
            where: {
                [Op.or]: [
                    { schoolName: { [Op.like]: '%Rainbow%' } },
                    { schoolId: { [Op.like]: '%Rainbow%' } }
                ]
            },
            order: [['rollNo', 'ASC']],
            raw: true
        });

        console.log(`Found ${students.length} students for Rainbow Concept`);

        if (students.length > 0) {
            console.log('Roll No | Name | Class');
            console.log('------------------------');
            students.forEach(s => {
                console.log(`${String(s.rollNo).padEnd(7)} | ${String(s.studentName).padEnd(20)} | ${s.class}`);
            });
        } else {
            console.log('No students found. Checking all school names...');
            const schools = await StudentReport.findAll({
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('schoolName')), 'schoolName']],
                raw: true
            });
            console.log(schools.map(s => s.schoolName));
        }

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}
check();
