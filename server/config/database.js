import Sequelize from 'sequelize';
import mysql2 from 'mysql2';
import pg from 'pg';

let sequelize;


const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;


if (dbUrl) {
    console.log('Using DATABASE_URL for connection');
    const isPostgres = dbUrl.startsWith('postgres');

    sequelize = new Sequelize(dbUrl, {
        dialect: isPostgres ? 'postgres' : 'mysql',
        dialectModule: isPostgres ? pg : mysql2,
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });

} else {
    const host = process.env.DB_HOST || 'localhost';
    const useSSL = process.env.DB_SSL === 'true' || (host !== 'localhost' && !host.includes('freesqldatabase.com'));

    console.log(`Attempting MySQL connection to ${host}... (SSL: ${useSSL})`);

    sequelize = new Sequelize(
        process.env.DB_NAME || 'viswam_reports',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || '2500',
        {
            host: host,
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
            dialectModule: mysql2,
            logging: false,
            dialectOptions: {
                // Support SSL for remote MySQL providers if needed
                ssl: useSSL ? {
                    rejectUnauthorized: false
                } : null
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );
}

export default sequelize;

