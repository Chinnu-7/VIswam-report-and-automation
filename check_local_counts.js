import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import User from './server/models/User.js';

async function checkLocal() {
    try {
        console.log(`Current DB URL: ${process.env.DATABASE_URL}`);
        const users = await User.count();
        const schools = await SchoolInfo.count();
        const reports = await StudentReport.count();
        console.log(`Local Database:`);
        console.log(`Users: ${users}`);
        console.log(`SchoolInfos: ${schools}`);
        console.log(`StudentReports: ${reports}`);
        process.exit(0);
    } catch (err) {
        console.error('Local check failed:', err.message);
        process.exit(1);
    }
}
checkLocal();
