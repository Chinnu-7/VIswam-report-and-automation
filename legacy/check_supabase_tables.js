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
        const [results] = await sequelize.query("SELECT * FROM information_schema.tables WHERE table_schema='public'");
        console.log('Full Results Length:', results.length);
        if (results.length > 0) {
            console.log('First Result Keys:', Object.keys(results[0]));
            console.log('Table Names:', results.map(r => r.table_name));
        } else {
            console.log('No tables found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error.message);
        process.exit(1);
    }
}

check();
