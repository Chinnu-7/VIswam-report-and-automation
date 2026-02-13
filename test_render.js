import StudentReport from './server/models/StudentReport.js';
import { renderReportHtml } from './server/controllers/renderController.js';
import fs from 'fs';

async function testRender() {
    try {
        const report = await StudentReport.findOne();
        if (!report) {
            console.log('No report found in DB, please upload some data first.');
            return;
        }

        const req = { params: { id: report.id } };
        const res = {
            send: (html) => {
                fs.writeFileSync('test_report.html', html);
                console.log('Test report generated: test_report.html');
            },
            status: (code) => ({ send: (msg) => console.log(`Status ${code}: ${msg}`) })
        };

        await renderReportHtml(req, res);
    } catch (err) {
        console.error('Test render failed:', err);
    }
}

testRender();
