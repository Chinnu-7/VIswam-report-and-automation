import axios from 'axios';

async function testApi2Pdf() {
    const apiKey = '7361f879-1c09-42b0-aee9-56ec533ee754';
    const pdfApiUrl = `https://v2.api2pdf.com/chrome/pdf/html`;
    
    console.log("Testing Api2Pdf Key with 30s timeout...");
    try {
        const start = Date.now();
        const response = await axios.post(pdfApiUrl, {
            html: "<h1>Test PDF</h1>",
            options: { format: 'A4' }
        }, {
            headers: { 'Authorization': apiKey },
            timeout: 30000
        });
        const duration = (Date.now() - start) / 1000;
        console.log(`✅ Success! PDF Generated in ${duration}s`);
        console.log("FileUrl:", response.data.FileUrl);
    } catch (err) {
        console.error("❌ Api2Pdf Test Failed!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", JSON.stringify(err.response.data));
        } else {
            console.error("Error:", err.message);
        }
    }
    process.exit(0);
}

testApi2Pdf();
