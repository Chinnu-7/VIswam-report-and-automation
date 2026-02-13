import Sequelize from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sequelize;

if (process.env.DATABASE_URL) {
    console.log('Connecting to Supabase/PostgreSQL...');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
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
} else {
    console.log('Using local SQLite database...');
    const storagePath = path.join(__dirname, '../../database.sqlite');
    sequelize = new Sequelize({
        dialect: 'sqlite',
        dialectModule: sqlite3,
        storage: storagePath,
        logging: false
    });
}

export default sequelize;
