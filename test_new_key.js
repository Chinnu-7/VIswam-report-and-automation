import axios from 'axios';

async function testApi2Pdf() {
    const apiKey = 'eac68149-5332-4534-83a2-d55fb9a62674';
    const pdfApiUrl = `https://v2.api2pdf.com/chrome/pdf/html`;
    
    console.log("Testing NEW Api2Pdf Key...");
    try {
        const response = await axios.post(pdfApiUrl, {
            html: "<h1>New Key Test</h1>",
            options: { format: 'A4' }
        }, {
            headers: { 'Authorization': apiKey },
            timeout: 10000
        });
        console.log("✅ Success! New key is working.");
        console.log("FileUrl:", response.data.FileUrl);
    } catch (err) {
        console.error("❌ New Key Test Failed!");
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
