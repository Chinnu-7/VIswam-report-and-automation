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

async function test() {
    try {
        console.log('Connecting to Supabase...');
        await sequelize.authenticate();
        console.log('Connection to Supabase has been established successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to Supabase:', error.message);
        process.exit(1);
    }
}

test();
