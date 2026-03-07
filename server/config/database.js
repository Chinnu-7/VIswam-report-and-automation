import Sequelize from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.warn('CRITICAL: DATABASE_URL environment variable is missing.');
}

console.log('Connecting to Supabase PostgreSQL database...');

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Required for Supabase pooling
        }
    },
    pool: {
        max: 5, // Supabase recommends keeping pool connections low for serverless
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 1000
    }
});

export default sequelize;
