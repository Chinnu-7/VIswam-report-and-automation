import User from './server/models/User.js';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import './server/models/associations.js';
import sequelizeLocal from './server/config/database.js';
import { Sequelize } from 'sequelize';
import pg from 'pg';

const remoteUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sequelizeRemote = new Sequelize(remoteUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const RemoteUser = sequelizeRemote.define('user', User.rawAttributes, { tableName: 'Users' });
const RemoteSchoolInfo = sequelizeRemote.define('school_info', SchoolInfo.rawAttributes, { tableName: 'SchoolInfos' });
const RemoteStudentReport = sequelizeRemote.define('student_report', StudentReport.rawAttributes, { tableName: 'StudentReports' });

async function migrate() {
    try {
        console.log('Starting granular migration...');

        console.log('Migrating SchoolInfos...');
        const schools = await SchoolInfo.findAll({ raw: true });
        console.log(`Found ${schools.length} schools.`);
        for (const school of schools) {
            try {
                await RemoteSchoolInfo.create(school, { hooks: false });
            } catch (err) {
                if (err.name !== 'SequelizeUniqueConstraintError') {
                    console.error(`  Failed for school ${school.schoolId}:`, err.message);
                }
            }
        }
        console.log('  SchoolInfos migration done.');

        console.log('Migrating Users...');
        const users = await User.findAll({ raw: true });
        console.log(`Found ${users.length} users.`);
        for (const user of users) {
            try {
                await RemoteUser.create(user, { hooks: false });
            } catch (err) {
                if (err.name !== 'SequelizeUniqueConstraintError') {
                    console.error(`  Failed for user ${user.email}:`, err.message);
                }
            }
        }
        console.log('  Users migration done.');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
