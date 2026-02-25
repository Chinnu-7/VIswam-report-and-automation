import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
            Promise.all(msg.args().map(a => a.jsonValue())).then(args => {
                console.log('ERROR ARGS:', JSON.stringify(args, null, 2));
            }).catch(e => console.log('Could not get args', e));
        } else {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR STR:', error.toString());
        console.log('PAGE ERROR STACK:', error.stack);
    });

    try {
        await page.goto('http://localhost:5174/report/217?view=student&qp=SCERT%202', { waitUntil: 'networkidle0' });
        // wait a bit for react to crash
        await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
        console.error('PUPPETEER ERROR:', err);
    } finally {
        await browser.close();
    }
})();
