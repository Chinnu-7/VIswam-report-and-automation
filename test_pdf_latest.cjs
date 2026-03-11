// test_pdf_latest.cjs
// Tests the PDF endpoint on the latest Vercel deployment
const https = require('https');

const host = 'viswam-report-card-jkinq4tb6-chinnu-7s-projects.vercel.app';
const path = '/api/reports/school/572834/pdf?assessmentName=Sodhana%201';

const options = { host, path, method: 'GET', headers: { 'Accept': 'application/json' } };

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Location:', res.headers.location || 'no redirect');
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        if (body) console.log('Body (first 300):', body.substring(0, 300));
    });
});
req.on('error', e => console.error('Error:', e.message));
req.setTimeout(30000, () => { req.destroy(); console.error('Timeout'); });
req.end();
