import db from './server/config/database.js';
import StudentReport from './server/models/StudentReport.js';

async function run() {
    try {
        console.log("Fetching reports for 572834...");
        const reports = await StudentReport.findAll({
            where: { schoolId: '572834' },
            limit: 5
        });
        console.log("Reports Found:", reports.map(r => ({ id: r.id, schoolId: r.schoolId, schoolName: r.schoolName })));
    } catch(e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}

run();
