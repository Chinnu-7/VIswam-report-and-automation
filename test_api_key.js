import axios from 'axios';

async function testApi() {
    const htmlString = "<h1>Test Report</h1><p>If you see this, the API key works.</p>";
    const pdfApiUrl = `https://v2.api2pdf.com/chrome/pdf/html`;
    const key = '7361f879-1c09-42b0-aee9-56ec533ee754';
    
    try {
        console.log("Testing Api2Pdf with key:", key);
        const response = await axios.post(pdfApiUrl, {
            html: htmlString,
            options: { format: 'A4' }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': key
            },
            timeout: 30000
        });
        console.log("Response:", response.data);
    } catch (e) {
        console.log("Error:", e.response ? e.response.status : e.message);
        console.log("Error Data:", e.response ? e.response.data : 'no data');
    }
}

testApi();
