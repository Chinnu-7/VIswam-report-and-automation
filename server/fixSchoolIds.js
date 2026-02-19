import sequelize from './config/database.js';
import StudentReport from './models/StudentReport.js';

async function fixSchoolIds() {
    try {
        console.log('Searching for mismatched school IDs for students A11, A12...');

        // Fix students A11 (550154) and A12 (550064) specifically, 
        // or any students with names A11/A14 that might have the wrong schoolId
        const results = await StudentReport.update(
            { schoolId: '550164' },
            {
                where: {
                    studentName: ['A11', 'A12', 'A13', 'A14'],
                    schoolId: ['550154', '550064']
                }
            }
        );

        console.log(`Updated ${results[0]} records successfully.`);
        process.exit(0);
    } catch (error) {
        console.error('Error fixing school IDs:', error);
        process.exit(1);
    }
}

fixSchoolIds();
