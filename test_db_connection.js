import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    console.log('Testing MySQL connection...');
    console.log('Config:', {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '2500',
        database: process.env.DB_NAME || 'viswam_reports'
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '2500',
            database: process.env.DB_NAME || 'viswam_reports'
        });
        console.log('Successfully connected to MySQL');
        const [rows] = await connection.execute('SELECT 1 + 1 AS result');
        console.log('Query result:', rows[0].result);
        await connection.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.log('Database does not exist. Attempting to create it...');
            try {
                const connection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASS || '2500'
                });
                await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'viswam_reports'}\``);
                console.log('Database created successfully');
                await connection.end();
            } catch (createErr) {
                console.error('Failed to create database:', createErr.message);
            }
        }
    }
}

testConnection();
