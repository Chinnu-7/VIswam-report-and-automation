import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function uploadFile() {
  try {
    // 1. Login
    const loginRes = await axios.post('https://viswam-report-card.vercel.app/api/auth/login', {
      email: 'admin@viswam.com',
      password: 'admin123'
    });
    const { token } = loginRes.data;
    console.log('Login successful, token obtained.');

    // 2. Upload
    const form = new FormData();
    form.append('file', fs.createReadStream('d:/Viswam Report card/Sodhan1_572834_2025-2026.xls'));
    form.append('assessmentName', 'Sodhana 1');
    form.append('schoolId', '572834');
    form.append('qp', 'SCERT 1');
    form.append('force', 'true');

    const response = await axios.post('https://viswam-report-card.vercel.app/api/upload/students', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
    });
    console.log('Upload Result:', response.data);
  } catch (error) {
    console.error('Upload Error:', error.response ? error.response.data : error.message);
  }
}

uploadFile();
