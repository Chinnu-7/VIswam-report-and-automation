import { execSync } from 'child_process';

const envs = {
    DATABASE_URL: 'mysql://sql12819353:U89uqXuLTp@sql12.freesqldatabase.com:3306/sql12819353',
    JWT_SECRET: 'viswam_secret_2025_#$!',
    NODE_ENV: 'production',
};

for (const [key, value] of Object.entries(envs)) {
    console.log(`Updating ${key} (production)...`);
    try {
        // Remove if exists
        try {
            execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
        } catch (e) { /* ignore if not exists */ }

        // Add new value
        execSync(`echo | set /p="${value}" | npx vercel env add ${key} production`, {
            stdio: ['pipe', 'inherit', 'inherit'],
            shell: 'cmd.exe'
        });
        console.log(`✅ ${key} updated.`);
    } catch (err) {
        console.error(`❌ Failed to set ${key}: ${err.message}`);
    }
}
console.log('Done.');
