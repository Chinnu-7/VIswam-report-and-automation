import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const createDb = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '2500'
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'viswam_reports'}\`;`);
        console.log(`Database ${process.env.DB_NAME || 'viswam_reports'} created or already exists.`);
        await connection.end();
    } catch (error) {
        console.error('Error creating database:', error);
    }
};

createDb();
