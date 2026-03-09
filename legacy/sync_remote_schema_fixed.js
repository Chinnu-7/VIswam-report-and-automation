import { Sequelize } from 'sequelize';
import pg from 'pg';
import User from './server/models/User.js';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import './server/models/associations.js';

const remoteUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sequelizeRemote = new Sequelize(remoteUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: console.log, // Enable logging for sync
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function syncRemote() {
    try {
        console.log('Force syncing remote Supabase schema...');
        await sequelizeRemote.authenticate();

        // Define remote versions of the models on the remote connection
        const RemoteSchoolInfo = sequelizeRemote.define('SchoolInfo', SchoolInfo.rawAttributes, { tableName: 'SchoolInfos' });
        const RemoteUser = sequelizeRemote.define('User', User.rawAttributes, { tableName: 'Users' });
        const RemoteStudentReport = sequelizeRemote.define('StudentReport', StudentReport.rawAttributes, { tableName: 'StudentReports' });

        await RemoteSchoolInfo.sync({ force: true });
        await RemoteUser.sync({ force: true });
        await RemoteStudentReport.sync({ force: true });

        console.log('Remote schema force sync completed.');
        process.exit(0);
    } catch (err) {
        console.error('Remote sync failed:', err);
        process.exit(1);
    }
}

syncRemote();
