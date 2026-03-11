// redeploy_vercel.mjs
// Triggers a Vercel redeploy via the correct API endpoint
import axios from 'axios';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_eq6k8MlefnfgdwUowtcq8nUbwthT';
const TEAM_ID = 'team_35IlGPazxrcNAu05e2bQ6od4';
const headers = { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' };

(async () => {
    try {
        // Get latest production deployment
        const listRes = await axios.get(
            `https://api.vercel.com/v6/deployments`,
            { headers, params: { projectId: PROJECT_ID, teamId: TEAM_ID, target: 'production', limit: 1, state: 'READY' } }
        );
        const latest = listRes.data.deployments[0];
        if (!latest) { console.error('No READY production deployment found'); process.exit(1); }
        console.log('Latest deployment found:', latest.url, '| uid:', latest.uid);

        // Redeploy by referencing the existing deployment
        const redeployRes = await axios.post(
            `https://api.vercel.com/v13/deployments`,
            {
                deploymentId: latest.uid,
                name: 'viswam-report-card',
                target: 'production',
            },
            { headers, params: { teamId: TEAM_ID, forceNew: 1 } }
        );
        console.log('✅ Redeploy started! URL will be:', redeployRes.data.url || redeployRes.data.id);
    } catch (err) {
        const errData = err.response?.data;
        console.error('❌ Error:', errData ? JSON.stringify(errData, null, 2) : err.message);
    }
})();
