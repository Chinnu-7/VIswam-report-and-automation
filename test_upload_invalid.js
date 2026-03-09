import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

async function testUploadInvalid() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@viswam.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log("✅ Logged in successfully.");

        console.log("2. Uploading file with INVALID school ID...");
        const form = new FormData();
        form.append('file', fs.createReadStream('Sodhana1_518759_2025-2026.xlsx'));
        // Using an invalid schoolId that doesn't exist
        form.append('schoolId', '518759');
        form.append('assessmentName', 'Sodhana 1');
        form.append('qp', 'SCERT 1');

        const uploadRes = await axios.post('http://localhost:5000/api/upload/students', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log("✅ Upload Success:", uploadRes.data);
    } catch (e) {
        console.error("❌ Upload Error:", e.response ? e.response.data : e.message);
    }
}
testUploadInvalid();
