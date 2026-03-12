import sequelize from './server/config/database.js';
import StudentReport from './server/models/StudentReport.js';

async function resetStatus() {
    try {
        const schoolId = '572834';
        console.log(`Resetting status for school ${schoolId}...`);
        
        const count = await StudentReport.update(
            { isEmailSent: false, emailSentDate: null },
            { where: { schoolId } }
        );
        
        console.log(`Successfully reset ${count[0]} reports.`);
        process.exit(0);
    } catch (err) {
        console.error('Reset failed:', err);
        process.exit(1);
    }
}

resetStatus();
