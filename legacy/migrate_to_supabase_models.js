import User from './server/models/User.js';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import './server/models/associations.js';
import sequelizeLocal from './server/config/database.js'; // This is local by default as per .env
import { Sequelize } from 'sequelize';
import pg from 'pg';

const remoteUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sequelizeRemote = new Sequelize(remoteUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// Define remote models using the same schemas
const RemoteUser = sequelizeRemote.define('user', User.rawAttributes, { tableName: 'Users' });
const RemoteSchoolInfo = sequelizeRemote.define('school_info', SchoolInfo.rawAttributes, { tableName: 'SchoolInfos' });
const RemoteStudentReport = sequelizeRemote.define('student_report', StudentReport.rawAttributes, { tableName: 'StudentReports' });

async function migrate() {
    try {
        console.log('Starting model-based migration...');
        console.log('Diagnostic counts:');
        console.log('  Users:', await User.count());
        console.log('  Schools:', await SchoolInfo.count());
        console.log('  Reports:', await StudentReport.count());

        // 1. Migrate SchoolInfos first (due to FK)
        console.log('Migrating SchoolInfos...');
        const schools = await SchoolInfo.findAll({ raw: true });
        console.log(`Found ${schools.length} schools.`);
        if (schools.length > 0) {
            await RemoteSchoolInfo.bulkCreate(schools, { ignoreDuplicates: true });
            console.log('  SchoolInfos migrated.');
        }

        // 2. Migrate Users
        console.log('Migrating Users...');
        const users = await User.findAll({ raw: true });
        console.log(`Found ${users.length} users.`);
        if (users.length > 0) {
            await RemoteUser.bulkCreate(users, { ignoreDuplicates: true });
            console.log('  Users migrated.');
        }

        // 3. Migrate StudentReports
        console.log('Migrating StudentReports...');
        const reports = await StudentReport.findAll({ raw: true });
        console.log(`Found ${reports.length} reports.`);
        if (reports.length > 0) {
            // StudentReports might have circular/complex data, raw: true helps.
            // Ensure reportData is stringified if needed (but raw query usually returns it as-is)
            await RemoteStudentReport.bulkCreate(reports, { ignoreDuplicates: true });
            console.log('  StudentReports migrated.');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
