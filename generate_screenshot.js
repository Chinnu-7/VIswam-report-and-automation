import puppeteer from 'puppeteer';
import fs from 'fs';

async function generatePdf() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // const url = 'http://localhost:5000/api/reports/school/572834/pdf?assessmentName=Sodhana%201';
    // console.log(`Navigating to ${url}...`);
    // await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    const schoolId = '572834';
    const assessmentName = 'Sodhana 1';
    const renderUrl = `http://localhost:5000/api/reports/school/${schoolId}/render?assessmentName=${encodeURIComponent(assessmentName)}`;
    console.log(`Navigating to ${renderUrl}...`);
    
    await page.setViewport({ width: 1200, height: 1600 });
    await page.goto(renderUrl, { waitUntil: 'networkidle0' });
    
    const screenshotPath = 'd:/Viswam Report card/verify_572834_render.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

generatePdf();
