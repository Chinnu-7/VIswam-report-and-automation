import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const SCHOOL_ID = '572834';

async function testDispatch() {
    try {
        console.log(`--- Starting Test Dispatch for School ${SCHOOL_ID} ---`);

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
        // This will set status to APPROVED and trigger n8n
        console.log(`Approving reports and triggering notifications for school ${SCHOOL_ID}...`);
        const approveRes = await axios.post(`${API_URL}/reports/school/approve`, {
            schoolIds: [SCHOOL_ID]
        }, config);

        console.log('Dispatch request successful:', JSON.stringify(approveRes.data, null, 2));
        console.log('Check server logs for n8n trigger status.');

    } catch (error) {
        console.error('Test Dispatch failed:', error.response?.data || error.message);
    }
}

testDispatch();
