import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:2500@localhost:5432/viswam_reports';

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false
});

async function run() {
    try {
        const [schools] = await sequelize.query(`SELECT "schoolId", "schoolName" FROM "SchoolInfos" WHERE "schoolId" LIKE '%518759%'`);
        console.log("Matching schools:", JSON.stringify(schools, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
