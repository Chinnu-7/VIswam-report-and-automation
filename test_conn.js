import axios from 'axios';

async function testConnectivity() {
    const urls = [
        'https://api.vercel.com',
        'https://google.com',
        'https://v2.api2pdf.com'
    ];
    
    for (const url of urls) {
        try {
            console.log(`Testing connectivity to ${url}...`);
            const start = Date.now();
            await axios.get(url, { timeout: 5000 });
            console.log(`✅ Success! Reachable in ${(Date.now() - start) / 1000}s`);
        } catch (err) {
            console.error(`❌ Failed! Error: ${err.message}`);
        }
    }
    process.exit(0);
}

testConnectivity();
