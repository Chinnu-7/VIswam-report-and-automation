import fs from 'fs';
import { getPrincipalReportHtmlString } from './server/controllers/renderController.js';
import StudentReport from './server/models/StudentReport.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import dotenv from 'dotenv';
dotenv.config();

async function generateLocalHtml() {
    const schoolId = '572834';
    const assessmentName = 'Sodhana 1';

    try {
        const reports = await StudentReport.findAll({
            where: { schoolId, assessmentName }
        });

        if (reports.length === 0) {
            console.log('No reports found.');
            return;
        }

        const schoolInfo = await SchoolInfo.findOne({ where: { schoolId } });
        const qp = reports[0]?.qp || '';
        
        const html = await getPrincipalReportHtmlString(reports, schoolInfo, assessmentName, qp);
        fs.writeFileSync('test_report.html', html);
        console.log('Successfully saved to test_report.html');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

generateLocalHtml();
