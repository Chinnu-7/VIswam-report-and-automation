// redeploy_vercel2.mjs
// Triggers a Vercel redeploy using the deployment URL/uid
import axios from 'axios';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_eq6k8MlefnfgdwUowtcq8nUbwthT';
const TEAM_ID = 'team_35IlGPazxrcNAu05e2bQ6od4';
const headers = { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' };

(async () => {
    try {
        // Step 1: Get latest deployment
        const listRes = await axios.get(
            `https://api.vercel.com/v6/deployments`,
            { 
                headers, 
                params: { projectId: PROJECT_ID, teamId: TEAM_ID, target: 'production', limit: 1, state: 'READY' }
            }
        );
        const latest = listRes.data.deployments[0];
        if (!latest) { console.error('No READY production deployment found'); process.exit(1); }
        console.log('Found deployment:', latest.uid, '-', latest.url);

        // Step 2: Get the full deployment details to get git metadata
        const detailRes = await axios.get(
            `https://api.vercel.com/v13/deployments/${latest.uid}`,
            { headers, params: { teamId: TEAM_ID } }
        );
        const gitSource = detailRes.data.gitSource;
        console.log('Git source:', JSON.stringify(gitSource));

        // Step 3: Create new deployment from the same git source
        if (gitSource) {
            const newDeploy = await axios.post(
                `https://api.vercel.com/v13/deployments`,
                {
                    name: 'viswam-report-card',
                    target: 'production',
                    gitSource: gitSource,
                },
                { headers, params: { teamId: TEAM_ID, forceNew: 1 } }
            );
            console.log('✅ Redeploy triggered! ID:', newDeploy.data.id, 'URL:', newDeploy.data.url);
        } else {
            console.log('No git source found. Attempting direct redeploy...');
            const newDeploy = await axios.post(
                `https://api.vercel.com/v13/deployments`,
                {
                    name: 'viswam-report-card',
                    deploymentId: latest.uid,
                    target: 'production',
                },
                { headers, params: { teamId: TEAM_ID, forceNew: 1 } }
            );
            console.log('✅ Redeploy triggered! URL:', newDeploy.data.url);
        }
    } catch (err) {
        const errData = err.response?.data;
        console.error('❌ Error:', errData ? JSON.stringify(errData, null, 2) : err.message);
    }
})();
