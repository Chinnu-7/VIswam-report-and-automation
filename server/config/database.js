import Sequelize from 'sequelize';
import pg from 'pg';
import mysql2 from 'mysql2';
import dotenv from 'dotenv';

// Only load .env file in development; in production clouds provide env vars directly
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const dbUrl = process.env.DATABASE_URL;
console.log('DB Config: DATABASE_URL is', dbUrl ? 'SET' : 'MISSING');
console.log('DB Config: NODE_ENV is', JSON.stringify(process.env.NODE_ENV));

if (!dbUrl) {
    console.error('CRITICAL: DATABASE_URL environment variable is missing!');
}

const isLocal = dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'));
const isPostgres = dbUrl && dbUrl.startsWith('postgres');
console.log('DB Config: isLocal =', isLocal, 'isPostgres =', isPostgres);

const sequelize = new Sequelize(dbUrl || '', {
    dialectModule: isPostgres ? pg : mysql2,
    logging: false,
    dialectOptions: {
        ssl: (isLocal || !isPostgres) ? false : {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 1000
    }
});

export default sequelize;
