import axios from 'axios';

async function testTrigger() {
    try {
        console.log('Logging in as Admin...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@viswam.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Login successful. Fetching reports for Brilliant high school (516238)...');

        const reportsRes = await axios.get('http://localhost:5000/api/reports?schoolId=516238', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const reports = reportsRes.data;
        if (reports.length === 0) {
            console.log('No reports found for this school.');
            return;
        }

        const reportId = reports[0].id;
        console.log(`Found report ID: ${reportId}. Approving report to trigger n8n webhook...`);

        const approveRes = await axios.post('http://localhost:5000/api/reports/approve', {
            ids: [reportId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Approval API Response:', JSON.stringify(approveRes.data, null, 2));

    } catch (err) {
        console.error('Error in test trigger:', err.response?.data || err.message);
    }
}

testTrigger();
