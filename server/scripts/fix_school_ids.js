
import sequelize from '../config/database.js';
import StudentReport from '../models/StudentReport.js';
import { Op } from 'sequelize';

const fixSchoolIds = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Fetch all reports
        const reports = await StudentReport.findAll();
        console.log(`Found ${reports.length} reports. Normalizing School IDs...`);

        let count = 0;
        for (const report of reports) {
            if (report.schoolId && report.schoolId !== report.schoolId.toUpperCase()) {
                const newId = report.schoolId.toUpperCase();
                await report.update({ schoolId: newId });
                count++;
            }
        }

        console.log(`Updated ${count} records to Uppercase School ID.`);
        process.exit(0);
    } catch (error) {
        console.error('Error fixing School IDs:', error);
        process.exit(1);
    }
};

fixSchoolIds();
