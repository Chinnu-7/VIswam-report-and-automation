import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const localUrl = process.env.DATABASE_URL;
const remoteUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const localDb = new Sequelize(localUrl, { dialect: 'postgres', dialectModule: pg, logging: false });
const remoteDb = new Sequelize(remoteUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function migrate() {
    try {
        console.log('Starting migration...');

        const tables = ['Users', 'SchoolInfos', 'StudentReports'];

        for (const table of tables) {
            console.log(`Migrating ${table}...`);
            const [rows] = await localDb.query(`SELECT * FROM "${table}"`);
            console.log(`Found ${rows.length} rows in local ${table}.`);

            if (rows.length > 0) {
                // Ensure remote table is ready and altered if needed
                // We'll trust the server/index.js changes will handle this on run,
                // but for this script we might need to manually ensure columns exist.

                // Chunking to avoid large payloads
                const chunkSize = 100;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);

                    // We need to handle potential duplicate IDs or just use the same IDs
                    // Since remote is empty, direct insert should work.
                    // However, we should be careful with timestamps and JSON fields.

                    // For StudentReports, reportData might need re-stringifying if it was parsed by get()
                    // But raw query should return strings/objects based on pg driver.

                    const columns = Object.keys(chunk[0]).map(c => `"${c}"`).join(',');
                    const placeholders = chunk.map((_, idx) => {
                        return '(' + Object.keys(chunk[0]).map((__, cIdx) => `$${idx * Object.keys(chunk[0]).length + cIdx + 1}`).join(',') + ')';
                    }).join(',');

                    const values = chunk.flatMap(row => Object.values(row));

                    await remoteDb.query(`INSERT INTO "${table}" (${columns}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, {
                        bind: values
                    });
                    console.log(`  Migrated chunk ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
                }
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
