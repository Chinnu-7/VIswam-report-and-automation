import db from './server/config/database.js';
import Sequelize from 'sequelize';

async function checkSchema() {
    try {
        console.log("Checking SchoolInfos table structure...");
        const [results, metadata] = await db.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'SchoolInfos'");
        console.log("SchoolInfos Columns:", results);

        console.log("\nChecking StudentReports table structure...");
        const [res2, meta2] = await db.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'StudentReports'");
        console.log("StudentReports Columns:", res2);

        console.log("\nChecking Users table structure...");
        const [res3, meta3] = await db.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'Users'");
        console.log("Users Columns:", res3);
        
    } catch(e) {
        console.error("Error checking schema:", e.message);
    }
    process.exit(0);
}

checkSchema();
