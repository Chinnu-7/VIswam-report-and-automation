import sequelize from './server/config/database.js';

async function resetEmails() {
    try {
        // Reset Little Indians School (564170)
        const [results] = await sequelize.query(`
            UPDATE "StudentReports" 
            SET "isEmailSent" = false, "emailSentDate" = null 
            WHERE "schoolId" IN ('564170') 
            AND "isEmailSent" = true;
        `);
        console.log("Successfully reset 'isEmailSent' for Little Indians School to false.");
    } catch (err) {
        console.error("Error resetting:", err);
    } finally {
        process.exit(0);
    }
}

resetEmails();
