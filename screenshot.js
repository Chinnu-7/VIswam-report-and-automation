import puppeteer from 'puppeteer';
import path from 'path';

const test = async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Load the local HTML file
        const htmlPath = path.resolve('test_report.html');
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
        
        // Take a screenshot of the table area
        await page.screenshot({ 
            path: 'C:/Users/Mprad/.gemini/antigravity/brain/a028c093-ec69-4d97-bd0a-5b047491d003/fixed_report_572834.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 800, height: 1000 }
        });
        
        console.log('Screenshot saved!');
        await browser.close();
    } catch (e) {
        console.error(e);
    }
};

test();
