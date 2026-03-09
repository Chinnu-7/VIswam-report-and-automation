import { execSync } from 'child_process';

const envs = {
    DATABASE_URL: 'postgresql://postgres.rxqgfvhapuleaiacnici:IphTlVL1AEMU3G94@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    JWT_SECRET: 'secret123',
    N8N_WEBHOOK_URL: 'https://oversalty-insipient-andera.ngrok-free.dev/webhook/approval-status',
    N8N_WEBHOOK_SYNC_URL: 'https://oversalty-insipient-andera.ngrok-free.dev/webhook/approval-status'
};

for (const [key, value] of Object.entries(envs)) {
    console.log(`Setting ${key}...`);
    try {
        execSync(`npx vercel env add ${key} production`, {
            input: value,
            stdio: ['pipe', 'inherit', 'inherit']
        });
    } catch (err) {
        console.error(`Failed to set ${key}`);
    }
}
console.log('Done mapping environments.');
