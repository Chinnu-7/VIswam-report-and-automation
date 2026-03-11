import axios from 'axios';
import { StudentReport, SchoolInfo } from './server/models/associations.js';
import dotenv from 'dotenv';
dotenv.config();

async function triggerManual() {
    const schoolId = '572834';
    const assessmentName = 'Sodhana 1';
    const webhookUrl = 'https://pradeep1234.app.n8n.cloud/webhook/approve-school-report';

    try {
        console.log(`Searching for school info for ${schoolId}...`);
        const school = await SchoolInfo.findOne({ where: { schoolId } });
        
        if (!school) {
            console.error('School not found in database.');
            return;
        }

        const report = await StudentReport.findOne({ 
            where: { schoolId, assessmentName } 
        });

        const payload = {
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            principalEmail: 'viswam.reportcard@gmail.com', // Using fallback for testing as requested previously
            studentCount: await StudentReport.count({ where: { schoolId, assessmentName } }),
            assessmentName: assessmentName,
            timestamp: new Date().toISOString()
        };

        console.log('Sending payload to n8n:', JSON.stringify(payload, null, 2));
        const response = await axios.post(webhookUrl, payload);
        console.log('n8n Response:', response.data);
        console.log('SUCCESS: Webhook triggered successfully.');

    } catch (error) {
        console.error('Error triggering webhook:', error.response ? error.response.data : error.message);
    }
}

triggerManual();
