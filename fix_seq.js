import db from './server/config/database.js';

async function fixSequences() {
    try {
        console.log("Fixing StudentReports_id_seq...");
        const [res1] = await db.query('SELECT setval(\'"StudentReports_id_seq"\', (SELECT MAX(id) FROM "StudentReports"))');
        console.log("StudentReports_id_seq set to:", res1[0].setval);

        console.log("\nFixing Users_id_seq...");
        const [res2] = await db.query('SELECT setval(\'"Users_id_seq"\', (SELECT MAX(id) FROM "Users"))');
        console.log("Users_id_seq set to:", res2[0].setval);

        console.log("\n✅ Sequences synchronized successfully!");
    } catch(e) {
        console.error("Error fixing sequences:", e.message);
    }
    process.exit(0);
}

fixSequences();
