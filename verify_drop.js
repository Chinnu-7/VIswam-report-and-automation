import pg from 'pg';

const dbUrl = 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        await client.connect();
        const res = await client.query("SELECT count(*) FROM \"StudentReports\"");
        console.log(`StudentReports has ${res.rows[0].count} rows.`);
        await client.end();
    } catch (err) {
        console.log('Verify failed (likely table does not exist):', err.message);
    }
}

verify();
