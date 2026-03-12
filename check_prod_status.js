import axios from 'axios';

const API_URL = 'https://viswam-report-card.vercel.app/api';
const SCHOOL_ID = '572834';

async function checkStatus() {
    try {
        console.log(`--- Checking Production Status for School ${SCHOOL_ID} ---`);

        // 1. Login as admin
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@viswam.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Fetch reports for the school
        const res = await axios.get(`${API_URL}/reports?schoolId=${SCHOOL_ID}`, config);
        const reports = res.data.reports || res.data;
        
        const total = reports.length;
        const sent = reports.filter(r => r.isEmailSent).length;
        
        console.log(`Total Reports: ${total}`);
        console.log(`Sent: ${sent}`);
        
        if (sent === total && total > 0) {
            console.log('SUCCESS: All reports are marked as SENT in production.');
        } else {
            console.log('NOT READY: Some reports are still pending sent status.');
        }

    } catch (error) {
        console.error('Status check failed:', error.response?.data || error.message);
    }
}

checkStatus();
