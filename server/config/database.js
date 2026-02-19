import Sequelize from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sequelize;

if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const isPostgres = dbUrl.startsWith('postgres');

    console.log(`Connecting to ${isPostgres ? 'PostgreSQL' : 'MySQL'} via URL...`);

    sequelize = new Sequelize(dbUrl, {
        dialect: isPostgres ? 'postgres' : 'mysql',
        dialectModule: isPostgres ? pg : undefined,
        logging: false,
        dialectOptions: isPostgres ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    });
} else {
    console.log('Connecting to local MySQL database...');
    sequelize = new Sequelize(
        process.env.DB_NAME || 'viswam_reports',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || '2500',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            logging: false
        }
    );
}

export default sequelize;
