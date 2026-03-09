import Sequelize from 'sequelize';
import pg from 'pg';
import mysql2 from 'mysql2';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import User from './server/models/User.js';
import './server/models/associations.js';
import { seedAdmin } from './server/controllers/authController.js';

// Hardcoded for the one-time fix as requested by the migration context
const dbUrl = 'mysql://sql12819353:U89uqXuLTp@sql12.freesqldatabase.com:3306/sql12819353';

console.log('--- Database Setup Tool ---');
console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Mask password

const sequelize = new Sequelize(dbUrl, {
    dialectModule: mysql2,
    logging: console.log,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

async function runSetup() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection successful.');

        console.log('Force syncing tables (creating missing ones)...');
        // ORDER MATTERS: SchoolInfo must be synced first as others reference it.
        await SchoolInfo.sync({ alter: true });
        await User.sync({ alter: true });
        await StudentReport.sync({ alter: true });
        console.log('✅ All tables synced in correct order.');

        console.log('Seeding admin user...');
        await seedAdmin();
        console.log('✅ Admin seeding completed.');

        console.log('\nSUCCESS: Database is now ready for Vercel.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

runSetup();
