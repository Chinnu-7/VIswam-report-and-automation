import pg from 'pg';

const regions = [
    'ap-south-1',
    'us-east-1',
    'us-west-1',
    'eu-west-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'eu-central-1',
    'ca-central-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'sa-east-1',
    'us-east-2'
];

async function test() {
    for (const r of regions) {
        const url = 'postgres://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-0-' + r + '.pooler.supabase.com:6543/postgres?pgbouncer=true';
        console.log('Trying pooler:', url);
        const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
        try {
            await pool.query('SELECT 1');
            console.log('SUCCESS! Use this URL:', url);
            process.exit(0);
        } catch (e) {
            console.log('Failed:', e.message);
        }
        await pool.end();
    }
    console.log('Could not automatically determine pooler region. User needs to provide it manually.');
    process.exit(1);
}

test();
