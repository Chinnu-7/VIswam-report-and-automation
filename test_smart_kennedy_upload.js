import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const filePath = './Smart Kennededy.xlsx';
const loginUrl = 'http://localhost:5000/api/auth/login';
const uploadUrl = 'http://localhost:5000/api/upload/students';

async function testUpload() {
    try {
        console.log('Logging in...');
        const loginResponse = await axios.post(loginUrl, {
            email: 'admin@viswam.com',
            password: 'admin123'
        });
        const token = loginResponse.data.token;
        console.log('Login successful, token obtained.');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('assessmentName', 'FORMATIVE ASSESSMENT - 1');
        form.append('schoolName', 'Smart Kennedy');

        console.log('Starting upload for Smart Kennededy.xlsx...');
        const response = await axios.post(uploadUrl, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Upload successful:', response.data);
    } catch (error) {
        console.error('Operation failed:', error.response ? error.response.data : error.message);
    }
}

testUpload();
