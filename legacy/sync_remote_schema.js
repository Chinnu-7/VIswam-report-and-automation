import User from './server/models/User.js';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import './server/models/associations.js';
import sequelize from './server/config/database.js';

process.env.DATABASE_URL = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function syncRemote() {
    try {
        console.log('Force syncing remote Supabase schema...');
        await sequelize.authenticate();
        // Sync in order
        await SchoolInfo.sync({ force: true });
        await User.sync({ force: true });
        await StudentReport.sync({ force: true });
        console.log('Remote schema force sync completed.');
        process.exit(0);
    } catch (err) {
        console.error('Remote sync failed:', err);
        process.exit(1);
    }
}

syncRemote();
