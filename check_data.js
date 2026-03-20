import db from './server/config/database.js';

async function checkDuplicates() {
    try {
        console.log("Checking for duplicate IDs in StudentReports...");
        const [results] = await db.query('SELECT id, COUNT(*) FROM "StudentReports" GROUP BY id HAVING COUNT(*) > 1');
        console.log("Duplicate IDs found:", results);

        console.log("\nChecking for potential duplicates by school/assessment/rollNo...");
        const [res2] = await db.query('SELECT "schoolId", "assessmentName", "rollNo", "class", COUNT(*) FROM "StudentReports" GROUP BY "schoolId", "assessmentName", "rollNo", "class" HAVING COUNT(*) > 1 LIMIT 10');
        console.log("Duplicate students found:", res2);

        if (res2.length > 0) {
            const firstDup = res2[0];
            console.log("\nFetching details for first duplicate student...");
            const [details] = await db.query(`SELECT id, "schoolId", "schoolName", "assessmentName", "rollNo", "class" FROM "StudentReports" WHERE "schoolId" = '${firstDup.schoolId}' AND "assessmentName" = '${firstDup.assessmentName}' AND "rollNo" = '${firstDup.rollNo}' AND "class" = '${firstDup.class}'`);
            console.log("Details:", details);
        }

    } catch(e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

checkDuplicates();
