import db from './server/config/database.js';

async function checkSequence() {
    try {
        console.log("Checking StudentReports ID sequence...");
        const [maxIdResult] = await db.query('SELECT MAX(id) as max_id FROM "StudentReports"');
        const maxId = maxIdResult[0].max_id || 0;
        console.log("Max ID in StudentReports:", maxId);

        const [seqResult] = await db.query("SELECT last_value FROM \"StudentReports_id_seq\"");
        console.log("Current Seq Value (from last_value):", seqResult[0].last_value);

        // More accurate check for current value
        const [currVal] = await db.query("SELECT nextval('\"StudentReports_id_seq\"')");
        console.log("Next Predicted ID (and incremented seq):", currVal[0].nextval);
        
        if (maxId >= currVal[0].nextval) {
            console.warn("⚠️ WARNING: Max ID is greater than or equal to next sequence value! This will cause 'id must be unique' errors.");
            console.log("Fix recommendation: SELECT setval('\"StudentReports_id_seq\"', (SELECT MAX(id) FROM \"StudentReports\"));");
        } else {
            console.log("✅ Sequence appears to be ahead of max ID.");
        }

    } catch(e) {
        console.error("Error checking sequence:", e.message);
    }
    process.exit(0);
}

checkSequence();
