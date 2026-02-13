import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const filePath = 'c:/Users/Admin/Desktop/Viswam Data and Automation/Viswam Report card/Vignyan Rough.xlsx';
const url = 'http://localhost:5000/api/upload/students';

async function testUpload() {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    try {
        console.log('Starting upload...');
        const response = await axios.post(url, form, {
            headers: form.getHeaders()
        });
        console.log('Upload successful:', response.data);
    } catch (error) {
        console.error('Upload failed:', error.response ? error.response.data : error.message);
    }
}

testUpload();
