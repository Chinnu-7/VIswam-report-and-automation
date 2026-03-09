import pg from 'pg';

const dbUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function clear() {
    try {
        await client.connect();
        console.log('Connected to Supabase. Dropping tables...');
        await client.query('DROP TABLE IF EXISTS "StudentReports" CASCADE');
        await client.query('DROP TABLE IF EXISTS "SchoolInfos" CASCADE');
        await client.query('DROP TABLE IF EXISTS "Users" CASCADE');
        await client.query('DROP TABLE IF EXISTS "Viswam" CASCADE');
        console.log('Tables dropped.');
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('Clear failed:', err);
        process.exit(1);
    }
}

clear();
