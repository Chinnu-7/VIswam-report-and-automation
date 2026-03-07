import dotenv from 'dotenv';
import Sequelize from 'sequelize';
import mysql2 from 'mysql2';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbName = process.env.DB_NAME || 'viswam_reports';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';

console.log(`Connecting to ${dbHost}...`);

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: console.log
});

async function test() {
    try {
        await sequelize.authenticate();
        console.log('SUCCESS: Connection has been established successfully.');
        process.exit(0);
    } catch (error) {
        console.error('FAILURE: Unable to connect to the database:');
        console.error(error.message);
        process.exit(1);
    }
}

test();
