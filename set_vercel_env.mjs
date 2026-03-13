// set_vercel_env.mjs
// Uses Vercel REST API to add/update environment variables for the project.
// Run: node set_vercel_env.mjs

import axios from 'axios';
import { readFileSync } from 'fs';

// ---- CONFIGURATION ----
// Read vercel token from local vercel config
const vercelConfigPath = process.env.VERCEL_CONFIG || `${process.env.USERPROFILE || process.env.HOME}/.local/share/com.vercel.cli/auth.json`;

let vercelToken = process.env.VERCEL_TOKEN;
if (!vercelToken) {
    try {
        const authConfig = JSON.parse(readFileSync(`${process.env.USERPROFILE}/.vercel/auth.json`, 'utf8'));
        vercelToken = authConfig.token;
        console.log('Found Vercel token from auth file');
    } catch (e) {
        console.error('Could not find Vercel token. Please set VERCEL_TOKEN env var');
        process.exit(1);
    }
}

const PROJECT_ID = 'prj_eq6k8MlefnfgdwUowtcq8nUbwthT'; // from VERCEL_OIDC_TOKEN sub claim
const TEAM_ID = 'team_35IlGPazxrcNAu05e2bQ6od4'; // from VERCEL_OIDC_TOKEN

const envVarsToSet = [
    { key: 'API2PDF_KEY', value: '7361f879-1c09-42b0-aee9-56ec533ee754', target: ['production', 'preview', 'development'] },
    { key: 'N8N_WEBHOOK_URL', value: 'https://pradeep1234.app.n8n.cloud/webhook/approve-school-report', target: ['production', 'preview', 'development'] },
    { key: 'N8N_WEBHOOK_SYNC_URL', value: 'https://pradeep1234.app.n8n.cloud/webhook/sync-schools', target: ['production', 'preview', 'development'] },
    { key: 'FORCE_DB_SYNC', value: 'true', target: ['production'] },
];

const headers = { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' };
const baseUrl = `https://api.vercel.com/v9/projects/${PROJECT_ID}/env`;

async function getExistingEnvVars() {
    const res = await axios.get(baseUrl, { headers, params: { teamId: TEAM_ID } });
    return res.data.envs || [];
}

async function setEnvVar(envVar) {
    const existing = await getExistingEnvVars();
    const existingEntry = existing.find(e => e.key === envVar.key);

    if (existingEntry) {
        console.log(`Updating existing env var: ${envVar.key}`);
        await axios.patch(`${baseUrl}/${existingEntry.id}`, {
            value: envVar.value,
            target: envVar.target,
            type: 'plain'
        }, { headers, params: { teamId: TEAM_ID } });
    } else {
        console.log(`Creating new env var: ${envVar.key}`);
        await axios.post(baseUrl, {
            key: envVar.key,
            value: envVar.value,
            target: envVar.target,
            type: 'plain'
        }, { headers, params: { teamId: TEAM_ID } });
    }
}

(async () => {
    for (const envVar of envVarsToSet) {
        try {
            await setEnvVar(envVar);
            console.log(`✅ Set ${envVar.key} successfully`);
        } catch (err) {
            const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
            console.error(`❌ Error setting ${envVar.key}:`, errMsg);
        }
    }
    console.log('\nDone. Redeploy Vercel to apply changes.');
})();
