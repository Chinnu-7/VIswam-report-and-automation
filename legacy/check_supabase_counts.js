import { Sequelize } from 'sequelize';
import pg from 'pg';

const dbUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function check() {
    try {
        const tables = ['Users', 'SchoolInfos', 'StudentReports'];
        for (const tName of tables) {
            const [count] = await sequelize.query(`SELECT count(*) FROM "${tName}"`);
            console.log(`Table ${tName} has ${count[0].count} rows.`);
        }
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error.message);
        process.exit(1);
    }
}

check();
