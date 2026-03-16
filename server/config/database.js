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

const isMySQL = !dbUrl || dbUrl.startsWith('mysql');
console.log('DB Config: Dialect is', isMySQL ? 'MySQL' : 'Postgres');

const sequelize = new Sequelize(dbUrl || '', {
    dialect: isMySQL ? 'mysql' : 'postgres',
    dialectModule: isMySQL ? mysql2 : pg,
    logging: false,
    dialectOptions: {
        // SSL for RDS: Usually required for MySQL 8+, but we'll make it configurable 
        ssl: (isLocal || (dbUrl && !dbUrl.includes('rds.amazonaws.com'))) ? false : {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 3, // Lower max connections for serverless + small RDS (t4g.micro)
        min: 0,
        acquire: 60000,
        idle: 10000,
        evict: 1000
    }
});

export default sequelize;
