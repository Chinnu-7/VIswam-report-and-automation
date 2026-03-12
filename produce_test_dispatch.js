import axios from 'axios';

const API_URL = 'https://viswam-report-card.vercel.app/api';
const SCHOOL_ID = '572834';

async function testDispatch() {
    try {
        console.log(`--- Starting Production Test Dispatch for School ${SCHOOL_ID} ---`);

        // 1. Login as admin
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@viswam.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Approve reports for the school
        console.log(`Approving reports and triggering notifications for school ${SCHOOL_ID} in PRODUCTION...`);
        const approveRes = await axios.post(`${API_URL}/reports/school/approve`, {
            schoolIds: [SCHOOL_ID]
        }, config);

        console.log('Dispatch request successful:', JSON.stringify(approveRes.data, null, 2));
        console.log('Reports should now be processing in n8n.');

    } catch (error) {
        console.error('Production Test Dispatch failed:', error.response?.data || error.message);
    }
}

testDispatch();
