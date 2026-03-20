import db from './server/config/database.js';

async function checkIndexes() {
    try {
        console.log("Checking StudentReports indexes...");
        const [results] = await db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'StudentReports'");
        console.log("StudentReports Indexes:", results);

        console.log("\nChecking SchoolInfos indexes...");
        const [res2] = await db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'SchoolInfos'");
        console.log("SchoolInfos Indexes:", res2);

        console.log("\nChecking Users indexes...");
        const [res3] = await db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Users'");
        console.log("Users Indexes:", res3);
        
    } catch(e) {
        console.error("Error checking indexes:", e.message);
    }
    process.exit(0);
}

checkIndexes();
