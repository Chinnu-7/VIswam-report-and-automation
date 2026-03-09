import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false
});

async function check() {
    try {
        const [results] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Raw results:', results);

        for (const r of results) {
            const tName = r.table_name || r.TABLE_NAME;
            if (!tName) continue;
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
