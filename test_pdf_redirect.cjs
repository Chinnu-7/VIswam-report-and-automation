// test_pdf_redirect.cjs
// This script tests the PDF generation endpoint and verifies the 302 redirect URL.
const axios = require('axios');
require('dotenv').config({ path: './.env' });

const schoolId = '572834';
const assessmentName = encodeURIComponent('Sodhana 1');
const url = `https://viswam-report-card.vercel.app/api/reports/school/${schoolId}/pdf?assessmentName=${assessmentName}`;

(async () => {
  try {
    // Do not follow redirects to capture the Location header
    const response = await axios.get(url, { maxRedirects: 0, validateStatus: null });
    console.log('Status code:', response.status);
    if (response.status === 302 && response.headers.location) {
      console.log('Redirect URL:', response.headers.location);
    } else {
      console.log('Unexpected response. Body:', response.data);
    }
  } catch (err) {
    console.error('Error fetching endpoint:', err.message);
  }
})();
