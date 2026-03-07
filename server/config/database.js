import Sequelize from 'sequelize';
import mysql2 from 'mysql2';
import pg from 'pg';

let sequelize;


const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;


// FORCE SQLITE FOR NOW DUE TO BROKEN MYSQL
if (false && dbUrl) {
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
            },
            // For MySQL, ensure connections are handled properly
            connectTimeout: 60000
        },
        pool: {
            max: 2, // Low pool size for serverless
            min: 0,
            acquire: 30000,
            idle: 10000,
            evict: 1000 // Quickly evict dead connections
        }
    });

} else {
    const host = (process.env.DB_HOST || 'localhost').trim();
    const useSSL = process.env.DB_SSL === 'true' || (host !== 'localhost' && !host.includes('freesqldatabase.com'));

    console.log(`Using SQLite fallback due to external MySQL issues...`);

    // SQLite configuration that works both locally and on Vercel (/tmp is required on Vercel)
    const sqlitePath = process.env.VERCEL ? '/tmp/viswam_reports.sqlite' : './viswam_reports.sqlite';

    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: sqlitePath,
        logging: false
    });
}

export default sequelize;

