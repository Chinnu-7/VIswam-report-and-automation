import Sequelize from 'sequelize';
import mysql2 from 'mysql2';

let sequelize;



const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

let sequelize;

if (dbUrl) {
    const isPostgres = dbUrl.startsWith('postgres');

    sequelize = new Sequelize(dbUrl, {
        dialect: isPostgres ? 'postgres' : 'mysql',
        dialectModule: mysql2, // Use mysql2 for everything if possible, or handle postgres separately
        logging: false,
        dialectOptions: isPostgres ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME || 'viswam_reports',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || '2500',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            dialectModule: mysql2,
            logging: false
        }
    );
}

export default sequelize;

