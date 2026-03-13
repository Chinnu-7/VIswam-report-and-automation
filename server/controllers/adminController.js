import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import User from '../models/User.js';
import axios from 'axios';
import sequelize from '../config/database.js';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import FormData from 'form-data';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import * as gradingService from '../services/gradingService.js';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

// Helper for internal use (upload/approval)
export const performRecalculate = async (schoolId, assessmentName, qp = null) => {
    if (!schoolId || !assessmentName) {
        console.warn('performRecalculate called with missing schoolId or assessmentName');
        return 0;
    }

    const schoolIdUpper = schoolId.toUpperCase();

    const where = {
        [Op.or]: [
            { schoolId: schoolId },
            { schoolName: schoolId },
            { schoolId: schoolIdUpper },
            { schoolName: schoolIdUpper }
        ],
        assessmentName: assessmentName
    };

    if (qp) {
        where.qp = qp;
    }

    const reports = await StudentReport.findAll({ where });

    if (reports.length === 0) return 0;

    const plainReports = reports.map(r => r.get({ plain: true }));
    const stats = gradingService.computeCohortStats(plainReports);
    const updatedReports = gradingService.assignRelativeGrades(plainReports, stats);

    // OPTIMIZED: Using bulkCreate with updateOnDuplicate is the fastest way to 
    // update JSON columns in Postgres for large cohorts without Vercel timeouts.
    await StudentReport.bulkCreate(updatedReports, {
        updateOnDuplicate: ['reportData'],
        conflictAttributes: ['id']
    });

    return updatedReports.length;
};

export const recalculateGrades = async (req, res) => {
    const { schoolId, assessmentName, qp } = req.body;

    if (!schoolId || !assessmentName) {
        return res.status(400).json({ message: 'School Id and Assessment Name are required' });
    }

    console.log(`Recalculating grades for School: ${schoolId}, Assessment: ${assessmentName}${qp ? `, QP: ${qp}` : ''}`);

    try {
        const count = await performRecalculate(schoolId, assessmentName, qp);

        if (count === 0) {
            console.log(`No reports found for cohort: ${schoolId} / ${assessmentName}`);
            return res.status(404).json({ message: 'No reports found for this cohort. Please ensure School Name and Assessment Name match exactly.' });
        }

        res.json({
            message: `Successfully recalculated grades for ${count} students`
        });
    } catch (error) {
        console.error('Error recalculating grades:', error);
        res.status(500).json({ message: 'Error recalculating grades', details: error.message });
    }
};

export const getReports = async (req, res) => {
    try {
        const { status, id, schoolId, assessmentName, qp, studentName, class: className, schoolName } = req.query;
        const where = {};
        if (status) where.status = status;
        if (id) where.id = id;
        if (schoolId) where.schoolId = schoolId;
        if (assessmentName) where.assessmentName = assessmentName;
        if (qp) where.qp = qp;
        if (className) where.class = className;

        if (studentName) {
            where.studentName = { [Op.like]: `%${studentName}%` };
        }

        if (schoolName) {
            where.schoolName = { [Op.like]: `%${schoolName}%` };
        }


        const reports = await StudentReport.findAll({
            where,
            include: [{
                model: SchoolInfo,
                attributes: ['omrUploadDate', 'schoolName']
            }]
        });
        const parsedReports = reports.map(r => {
            const data = r.get({ plain: true });
            if (typeof data.reportData === 'string') {
                try {
                    data.reportData = JSON.parse(data.reportData);
                } catch (e) {
                    // Ignore parse errors safely
                }
            }
            return data;
        });

        res.json(parsedReports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ 
            message: 'Error fetching data', 
            error: error.message,
            code: error.message.includes('TIMEOUT') ? 'DB_TIMEOUT' : 'INTERNAL_SERVER_ERROR'
        });
    }
};

export const getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await StudentReport.findByPk(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const data = report.get({ plain: true });
        if (typeof data.reportData === 'string') {
            try {
                data.reportData = JSON.parse(data.reportData);
            } catch (e) {
                console.error("Failed to parse reportData string", e);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ message: 'Error fetching report' });
    }
};

// Debug routes removed for security

export const getSchoolInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const school = await SchoolInfo.findOne({ where: { schoolId: id } });
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }
        res.json(school);
    } catch (error) {
        console.error('Error fetching school info:', error);
        res.status(500).json({ message: 'Error fetching school info' });
    }
};

export const approveReports = async (req, res) => {
    const { ids } = req.body; // Array of IDs
    if (!ids || ids.length === 0) {
        return res.status(400).json({ message: 'No IDs provided' });
    }

    try {
        // 1. Update status to APPROVED
        await StudentReport.update(
            { status: 'APPROVED' },
            { where: { id: { [Op.in]: ids } } }
        );

        // 2. Trigger n8n for each school (grouped)
        // ONLY trigger for reports that haven't been sent yet
        const approvedReports = await StudentReport.findAll({
            where: { 
                id: { [Op.in]: ids },
                status: 'APPROVED',
                isEmailSent: false 
            }
        });

        const triggerResults = await processN8nTriggersMulti(req, approvedReports);
        res.json({ message: 'Reports approved and grouped triggers initiated', results: triggerResults });

    } catch (error) {
        console.error('Error approving reports:', error);
        res.status(500).json({ message: 'Error approving reports' });
    }
};

export const approveReportsBySchool = async (req, res) => {
    const { schoolIds } = req.body;
    if (!schoolIds || schoolIds.length === 0) {
        return res.status(400).json({ message: 'No school IDs provided' });
    }

    try {
        // Update selected reports to APPROVED
        const conditions = schoolIds.map(id => {
            if (id.includes('_')) {
                const [sId, aName, qpVal] = id.split('_');
                const cond = { schoolId: sId, assessmentName: aName };
                if (qpVal && qpVal !== 'noqp') cond.qp = qpVal;
                return cond;
            }
            return { schoolId: id };
        });

        await StudentReport.update(
            { status: 'APPROVED' },
            {
                where: {
                    [Op.or]: conditions,
                    status: 'PENDING'
                }
            }
        );

        // ONLY trigger for reports that haven't been sent yet
        const approvedReports = await StudentReport.findAll({
            where: {
                [Op.or]: conditions,
                status: 'APPROVED',
                isEmailSent: false
            }
        });

        const triggerResults = await processN8nTriggersMulti(req, approvedReports);
        res.json({ message: 'Reports approved by school and triggers initiated', results: triggerResults });
    } catch (error) {
        console.error('Error approving reports by school:', error);
        res.status(500).json({ message: 'Error approving reports by school' });
    }
};

// New Automated Dispatch Function for Cron Jobs
export const runAutomatedDispatch = async (req, res) => {
    try {
        console.log('--- Starting Automated Email Dispatch ---');

        // 1. Find all reports that are APPROVED but NOT YET SENT
        const approvedReports = await StudentReport.findAll({
            where: {
                status: 'APPROVED',
                isEmailSent: false
            }
        });

        if (approvedReports.length === 0) {
            console.log('No approved reports pending dispatch.');
            return res.json({ message: 'No reports pending dispatch today.', count: 0 });
        }

        // 2. Process them using the multi-trigger logic
        // This logic handles grouping by school and checking the 5-day dispatch window.
        const triggerResults = await processN8nTriggersMulti(req, approvedReports, true);

        const sentCount = triggerResults.filter(r => r.status === 'Triggered').length;
        console.log(`Automated dispatch complete. Sent reports for ${sentCount} schools.`);

        res.json({
            message: `Automated dispatch processed for ${approvedReports.length} reports.`,
            sentSchoolsCount: sentCount,
            results: triggerResults
        });
    } catch (error) {
        console.error('Error in automated dispatch:', error);
        res.status(500).json({ message: 'Automated dispatch failed', error: error.message });
    }
};

async function processN8nTriggersMulti(req, reportsArray, isAutomated = false) {
    const reportsBySchool = reportsArray.reduce((acc, report) => {
        if (!acc[report.schoolId]) {
            acc[report.schoolId] = [];
        }
        acc[report.schoolId].push(report);
        return acc;
    }, {});

    const triggerResults = [];

    for (const [schoolIdGroup, reports] of Object.entries(reportsBySchool)) {
        try {
            // Get Principal Email
            let school = await SchoolInfo.findOne({ where: { schoolId: schoolIdGroup } });
            
            // FALLBACK: If schoolId was blank or missing, try finding the school by name
            const schoolNameFromReport = reports[0]?.schoolName;
            if (!school && schoolNameFromReport) {
                school = await SchoolInfo.findOne({ where: { schoolName: schoolNameFromReport } });
            }

            const schoolId = school ? school.schoolId : schoolIdGroup;
            const principalEmail = school ? school.principalEmail : null;
            const whatsappNo = school ? school.whatsappNo : '';
            const schoolName = school ? school.schoolName : 'Unknown School';

            // Get assessmentName from the first report in the group
            const assessmentName = reports[0]?.assessmentName || 'Sodhana 1';

            if (!principalEmail) {
                console.warn(`No principal email found for school ${schoolId}`);
                triggerResults.push({ schoolId, status: 'No Email Found' });
                continue;
            }

            // Calculate Dispatch Date (Upload + 5 days)
            // For AUTOMATED runs (cron), we check if today >= dispatch date.
            // For MANUAL approvals from the UI, we always send immediately.
            let shouldSend = !isAutomated; // Manual approvals always send

            if (isAutomated && school.omrUploadDate) {
                const uploadDate = new Date(school.omrUploadDate);
                const dispatchDate = new Date(uploadDate);
                dispatchDate.setDate(dispatchDate.getDate() + 5);
                const today = new Date();
                if (today >= dispatchDate) shouldSend = true;
            } else if (isAutomated && !school.omrUploadDate) {
                // If automated but no OMR date set, still send for robustness
                shouldSend = true;
            }

            if (!shouldSend) {
                console.log(`[Automation] School ${schoolId} not yet on dispatch day. Skipping.`);
                triggerResults.push({ schoolId, status: 'Not Dispatch Day' });
                continue;
            }

            // Trigger n8n with LIGHTWEIGHT payload
            // n8n will handle the PDF download, email, and WhatsApp notification
            console.log(`[Automation] Triggering n8n for school ${schoolId} (${schoolName}), email: ${principalEmail}`);
            
            // Send exactly ONE payload per school/assessment group
            await axios.post(process.env.N8N_WEBHOOK_URL, {
                schoolId,
                assessmentName,
                schoolName,
                principalEmail,
                whatsappNo,
                studentCount: reports.length,
                timestamp: new Date().toISOString()
            });

            // IMPORTANT: Mark only the reports in THIS trigger as sent
            const reportIds = reports.map(r => r.id);
            await StudentReport.update(
                { isEmailSent: true, emailSentDate: new Date() },
                {
                    where: {
                        id: { [Op.in]: reportIds }
                    }
                }
            );

            triggerResults.push({ schoolId, status: 'Triggered', count: reports.length });
        } catch (err) {
            console.error(`Failed to trigger n8n for school ${schoolId}:`, err.message);
            triggerResults.push({ schoolId, status: 'Failed', error: err.message });
        }
    }

    return triggerResults;
}

export const generatePrincipalPdf = async (req, res) => {
    const { schoolId } = req.params;
    const { assessmentName, json } = req.query;

    if (!schoolId || !assessmentName) {
        return res.status(400).json({ message: 'schoolId and assessmentName are required' });
    }

    try {
        const cleanSchoolId = String(schoolId || '').trim();
        const cleanAssessment = String(assessmentName || '').trim();

        console.log(`Generating Principal PDF for school: [${cleanSchoolId}], assessment: [${cleanAssessment}]...`);

        // 1. Fetch ALL reports for this school/assessment
        const reports = await StudentReport.findAll({
            where: {
                schoolId: cleanSchoolId,
                assessmentName: cleanAssessment
            }
        });

        if (reports.length === 0) {
            return res.status(404).json({ message: 'No reports found for this school/assessment' });
        }

        // 2. Fetch School Info for participation stats
        const schoolInfo = await SchoolInfo.findOne({ where: { schoolId: cleanSchoolId } });

        // 3. Build Multi-Page HTML
        const { getPrincipalReportHtmlString } = await import('./renderController.js');
        const qp = reports[0]?.qp || '';
        const htmlString = await getPrincipalReportHtmlString(reports, schoolInfo, cleanAssessment, qp);

        console.log(`HTML built. PDF Generation via Api2Pdf...`);

        // 4. PDF generation using Api2Pdf
        const pdfApiUrl = `https://v2.api2pdf.com/chrome/pdf/html`;
        const response = await axios.post(pdfApiUrl, {
            html: htmlString,
            options: {
                landscape: false,
                printBackground: true,
                format: 'A4',
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.API2PDF_KEY || '7361f879-1c09-42b0-aee9-56ec533ee754'
            }
        });

        if (!response.data || !response.data.FileUrl) {
            throw new Error('PDF Generation failed');
        }

        // Only return JSON if explicitly requested. 
        // n8n HTTP Request node often sends Accept: application/json by default, 
        // which was causing it to download the JSON metadata instead of the PDF file.
        if (json === 'true') {
            return res.json({ fileUrl: response.data.FileUrl });
        }

        // Default behavior: Redirect to the temporary direct download link
        res.redirect(302, response.data.FileUrl);

    } catch (error) {
        console.error('Error generating PDF:', error.message);
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};

export const markSchoolNotified = async (req, res) => {
    const { schoolId } = req.params;
    const { assessmentName } = req.query;

    if (!schoolId || !assessmentName) {
        return res.status(400).json({ message: 'schoolId and assessmentName are required' });
    }

    try {
        await StudentReport.update(
            { isEmailSent: true, emailSentDate: new Date() },
            {
                where: {
                    schoolId,
                    assessmentName,
                    status: 'APPROVED'
                }
            }
        );
        res.json({ message: `Successfully marked school ${schoolId} as notified for ${assessmentName}` });
    } catch (error) {
        console.error('Error marking school as notified:', error);
        res.status(500).json({ message: 'Failed to update notification status' });
    }
};

export const rejectReports = async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
        return res.status(400).json({ message: 'No IDs provided' });
    }

    try {
        await StudentReport.update(
            { status: 'REJECTED' },
            { where: { id: { [Op.in]: ids } } }
        );
        res.json({ message: 'Reports rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting reports' });
    }
};

export const rejectReportsBySchool = async (req, res) => {
    const { schoolIds } = req.body;
    if (!schoolIds || schoolIds.length === 0) {
        return res.status(400).json({ message: 'No school IDs provided' });
    }

    try {
        const conditions = schoolIds.map(id => {
            if (id.includes('_')) {
                const [sId, aName, qpVal] = id.split('_');
                const cond = { schoolId: sId, assessmentName: aName };
                if (qpVal && qpVal !== 'noqp') cond.qp = qpVal;
                return cond;
            }
            return { schoolId: id };
        });

        await StudentReport.update(
            { status: 'REJECTED' },
            {
                where: {
                    [Op.or]: conditions,
                    status: 'PENDING'
                }
            }
        );
        res.json({ message: 'Reports rejected for selected schools' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting reports by school' });
    }
};

export const downloadBulkZip = async (req, res) => {
    // New: selection can be an array of {schoolId, assessmentName} objects for precision
    // Old: schoolIds array + single assessmentName (fallback)
    const { schoolIds, assessmentName, selections } = req.body;

    const itemsToProcess = selections || (schoolIds || []).map(id => ({
        schoolId: id,
        assessmentName: assessmentName || 'Sodhana 1'
    }));

    if (itemsToProcess.length === 0) {
        return res.status(400).json({ message: 'No schools selected' });
    }

    try {
        console.log(`Starting bulk ZIP for ${itemsToProcess.length} schools...`);

        // Set headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=Viswam_Reports_${new Date().getTime()}.zip`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            // We can't send a status code here as headers are already sent
        });

        archive.pipe(res);

        const { getPrincipalReportHtmlString } = await import('./renderController.js');

        // Helper to process a single school report
        const processReport = async (item) => {
            const cleanId = String(item.schoolId).trim();
            const cleanAssessment = String(item.assessmentName || 'Sodhana 1').trim();
            
            try {
                const reports = await StudentReport.findAll({
                    where: { schoolId: cleanId, assessmentName: cleanAssessment }
                });

                if (reports.length === 0) return { status: 'MISSING', id: cleanId, assessment: cleanAssessment };

                const schoolInfo = await SchoolInfo.findByPk(cleanId);
                const qp = reports[0]?.qp || '';
                const htmlString = await getPrincipalReportHtmlString(reports, schoolInfo, cleanAssessment, qp);

                const pdfApiUrl = `https://v2.api2pdf.com/chrome/pdf/html`;
                const pdfRes = await axios.post(pdfApiUrl, {
                    html: htmlString,
                    options: { landscape: false, printBackground: true, format: 'A4', marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 }
                }, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': process.env.API2PDF_KEY || '7361f879-1c09-42b0-aee9-56ec533ee754' }
                });

                if (pdfRes.data?.FileUrl) {
                    const fileResponse = await axios.get(pdfRes.data.FileUrl, { responseType: 'arraybuffer' });
                    const state = String(schoolInfo?.state || 'Unknown State').trim();
                    const district = String(schoolInfo?.district || 'Unknown District').trim();
                    
                    // User Request: Format is schoolid.pdf
                    const zipPath = `${state}/${district}/${cleanId}.pdf`;
                    
                    archive.append(Buffer.from(fileResponse.data), { name: zipPath });
                    return { status: 'SUCCESS', path: zipPath };
                }
                return { status: 'FAILED_PDF', id: cleanId };
            } catch (err) {
                return { status: 'ERROR', id: cleanId, error: err.message };
            }
        };

        // Process in chunks of 5 for performance and stability
        const chunkSize = 5;
        const results = [];
        for (let i = 0; i < itemsToProcess.length; i += chunkSize) {
            const chunk = itemsToProcess.slice(i, i + chunkSize);
            console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1}...`);
            const chunkResults = await Promise.all(chunk.map(item => processReport(item)));
            results.push(...chunkResults);
        }

        // Add a summary file to the ZIP
        const summaryText = results.map(r => `${r.status}: ${r.id || r.path} ${r.error ? `(${r.error})` : ''}`).join('\n');
        archive.append(summaryText, { name: 'summary.txt' });

        await archive.finalize();
        console.log('ZIP generation complete.');

    } catch (error) {
        console.error('Bulk ZIP failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to generate ZIP', error: error.message });
        }
    }
};

export const deleteReports = async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
        return res.status(400).json({ message: 'No IDs provided' });
    }

    try {
        await StudentReport.destroy({
            where: { id: { [Op.in]: ids } }
        });
        res.json({ message: 'Reports deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reports' });
    }
};

export const deleteReportsBySchool = async (req, res) => {
    const { schoolIds } = req.body;
    if (!schoolIds || schoolIds.length === 0) {
        return res.status(400).json({ message: 'No school IDs provided' });
    }

    try {
        const conditions = schoolIds.map(id => {
            if (id.includes('_')) {
                const [sId, aName, qpVal] = id.split('_');
                const cond = { schoolId: sId, assessmentName: aName };
                if (qpVal && qpVal !== 'noqp') cond.qp = qpVal;
                return cond;
            }
            return { schoolId: id };
        });

        await StudentReport.destroy({
            where: { [Op.or]: conditions }
        });
        res.json({ message: 'Reports deleted for selected schools' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reports by school' });
    }
};

// Automation Queue for n8n (Polling)
export const getAutomationQueue = async (req, res) => {
    try {
        const reports = await StudentReport.findAll({
            where: {
                status: 'APPROVED',
                isEmailSent: false
            }
        });

        if (!reports || reports.length === 0) {
            return res.json([]);
        }

        // Enhance with Principal Email
        const queue = [];
        for (const report of reports) {
            const school = await SchoolInfo.findOne({ where: { schoolId: report.schoolId } });
            queue.push({
                ...report.get({ plain: true }),
                principalEmail: school ? school.principalEmail : null,
                whatsappNo: school ? school.whatsappNo : null
            });
        }

        res.json(queue);
    } catch (error) {
        console.error('Error fetching automation queue:', error);
        res.status(500).json({ message: 'Error fetching queue' });
    }
};

export const markAsSent = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: 'Invalid IDs' });
    }

    try {
        await StudentReport.update(
            { isEmailSent: true },
            { where: { id: { [Op.in]: ids } } }
        );
        res.json({ message: `Marked ${ids.length} reports as sent` });
    } catch (error) {
        console.error('Error marking reports as sent:', error);
        res.status(500).json({ message: 'Error updating records' });
    }
};

export const updateSchoolsBatch = async (req, res) => {
    const { schools } = req.body; // Array of { schoolId, schoolName, principalEmail, whatsappNo }
    if (!schools || !Array.isArray(schools)) {
        return res.status(400).json({ message: 'Invalid schools data' });
    }

    try {
        // 1. SANITIZE AND MAP: Convert raw input to clean objects first
        const sanitized = schools.map(s => {
            let validDate = null;
            if (s.omrUploadDate) {
                const d = new Date(s.omrUploadDate);
                if (!isNaN(d.getTime())) {
                    validDate = d;
                }
            }

            return {
                schoolId: String(s.schoolId || '').trim().toUpperCase(),
                schoolName: String(s.schoolName || '').trim(),
                principalEmail: String(s.principalEmail || '').trim().toLowerCase(),
                whatsappNo: String(s.whatsappNo || '').trim(),
                registered: parseInt(s.registered) || 0,
                participated: parseInt(s.participated) || 0,
                omrUploadDate: validDate,
                state: String(s.state || '').trim(),
                district: String(s.district || '').trim()
            };
        }).filter(s => s.schoolId && s.principalEmail && s.principalEmail.includes('@'));

        // 2. DEDUPLICATE: Ensure schoolId is unique in the final batch
        const schoolsMap = new Map();
        sanitized.forEach(s => {
            // If multiple rows for same schoolId exist in Google Sheet, 
            // the LAST one wins (or we could merge, but overwriting is simpler)
            schoolsMap.set(s.schoolId, s);
        });

        const uniqueSchools = Array.from(schoolsMap.values());
        console.log(`Processing ${uniqueSchools.length} unique schools (from ${schools.length} input rows)`);

        if (uniqueSchools.length === 0) {
            return res.status(400).json({ message: 'No valid school records found after sanitization.' });
        }

        // CHUNKED UPSERT: Avoid packet size or timeout issues on shared MySQL/Postgres
        const chunks = [];
        const chunkSize = 50;
        for (let i = 0; i < uniqueSchools.length; i += chunkSize) {
            chunks.push(uniqueSchools.slice(i, i + chunkSize));
        }

        console.log(`Syncing ${uniqueSchools.length} schools in ${chunks.length} chunks...`);
        for (const chunk of chunks) {
            await SchoolInfo.bulkCreate(chunk, {
                updateOnDuplicate: ['schoolName', 'principalEmail', 'whatsappNo', 'registered', 'participated', 'omrUploadDate', 'state', 'district'],
                conflictAttributes: ['schoolId']
            });
        }

        // OPTIMIZED: Bulk Check/Create Users to avoid Vercel timeouts (10s limit)
        // Filter out clearly invalid emails like 'na' or 'pending'
        const validEmails = uniqueSchools
            .map(s => s.principalEmail)
            .filter(email => email && email.includes('@') && email.length > 3);

        const existingUsers = await User.findAll({
            where: { email: { [Op.in]: validEmails } },
            attributes: ['email']
        });
        const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

        // DEDUPLICATE: If multiple schools share the same principalEmail in the CSV, 
        // we only want to create ONE user account.
        const usersToCreateMap = new Map();
        uniqueSchools.forEach(school => {
            const email = school.principalEmail.toLowerCase();
            if (email.includes('@') && !existingEmailsSet.has(email) && !usersToCreateMap.has(email)) {
                usersToCreateMap.set(email, {
                    email: email,
                    password: 'password123', // Default password
                    role: 'principal',
                    schoolId: school.schoolId
                });
            }
        });

        const newUsersData = Array.from(usersToCreateMap.values());
        let newUsersCreatedCount = 0;

        if (newUsersData.length > 0) {
            // Speed Optimization: Pre-hash passwords manually to avoid slow individualHooks
            const salt = await bcrypt.genSalt(10);
            const hashedUsers = await Promise.all(newUsersData.map(async (u) => ({
                ...u,
                password: await bcrypt.hash(u.password, salt)
            })));

            await User.bulkCreate(hashedUsers, { validate: true });
            newUsersCreatedCount = hashedUsers.length;
        }

        res.json({
            message: `Successfully synced ${uniqueSchools.length} schools and ensures ${newUsersCreatedCount} principal accounts are ready.`,
            count: uniqueSchools.length
        });
    } catch (error) {
        console.error('Error syncing schools:', error);

        // Detailed Sequelize validation error extraction
        let detailMessage = error.message;
        if (error.errors && Array.isArray(error.errors)) {
            detailMessage = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
        }

        res.status(500).json({
            message: 'Error syncing schools',
            error: detailMessage
        });
    }
};

export const performSchoolSync = async () => {
    const url = 'https://docs.google.com/spreadsheets/d/1fl5NW2skc_8NC0x3vxE9Fcfm6HGF1-e2lOTy4IMs7N0/export?format=csv';

    console.log('[Sync] Fetching school data from Google Sheet...');
    const response = await axios.get(url);
    const text = response.data;

    if (typeof text !== 'string' || text.includes('<html') || text.includes('<!DOCTYPE')) {
        throw new Error('Received HTML instead of CSV data. Check Google Sheet publishing.');
    }

    // ROBUST MULTI-LINE CSV PARSER WITH CONTINUATION HEURISTIC
    const parseCSV = (csv) => {
        const physicalRows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];
            const nextChar = csv[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else if (char === '\n' || char === '\r') {
                    if (currentField || currentRow.length > 0) {
                        currentRow.push(currentField.trim());
                        physicalRows.push(currentRow);
                        currentRow = [];
                        currentField = '';
                    }
                    if (char === '\r' && nextChar === '\n') i++;
                } else {
                    currentField += char;
                }
            }
        }
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            physicalRows.push(currentRow);
        }

        if (physicalRows.length < 2) return physicalRows;

        // HEURISTIC: Merge split rows
        const headerCount = physicalRows[0].length;
        const processedRows = [physicalRows[0]];
        
        for (let i = 1; i < physicalRows.length; i++) {
            let row = physicalRows[i];
            // If row is too short and next row starts with empty fields, or this row ends abruptly
            if (row.length < headerCount && i + 1 < physicalRows.length) {
                const nextRow = physicalRows[i + 1];
                // Check if merging makes sense (greedy merge)
                if (row.length + nextRow.length >= headerCount) {
                    row = [...row, ...nextRow];
                    i++; // Skip next physical row
                }
            }
            processedRows.push(row);
        }

        return processedRows;
    };

    const allRows = parseCSV(text);
    if (allRows.length < 2) throw new Error('CSV is empty or invalid');

    const headers = allRows[0].map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
    const dataRows = allRows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
    });

    const keyNSF = 'nsfuserid';
    const keyEmail = 'schoolemailid';
    const keyContact = 'poccontactno';
    const keyOMRDate = 'dateofuploadingomrtodrive';

    const rawSchools = dataRows.map(row => {
        const id = String(row[keyNSF] || row['schoolid'] || row['id'] || row['schoolcode'] || '').trim();
        if (!id || id.length < 3) return null;

        let email = row[keyEmail] || row['principalemail'] || row['email'] || '';
        if (!email || !email.includes('@')) {
            // Generate placeholder for schools missing email so they can still sync and receive reports
            email = `pending_${id}@viswam.com`;
        }

        return {
            schoolId: id,
            schoolName: row['schoolname'] || row['nsfschoolname'] || row['name'] || id,
            principalEmail: email,
            whatsappNo: row[keyContact] || row['contactnumber'] || row['whatsapp'] || row['phone'] || '',
            registered: parseInt(row['totalstudentsregistered'] || row['registered'] || 0, 10) || 0,
            participated: parseInt(row['noofomrsreceived'] || row['participated'] || 0, 10) || 0,
            omrUploadDate: row[keyOMRDate] || null,
            state: row['state'] || '',
            district: row['district'] || row['viswammaruthi'] || ''
        };
    }).filter(s => s && s.schoolId && s.principalEmail);

    if (rawSchools.length === 0) {
        throw new Error('No valid school records found in CSV.');
    }

    return rawSchools;
};

export const syncSchoolsFromGoogleSheet = async (req, res) => {
    try {
        const rawSchools = await performSchoolSync();
        // Inject into updateSchoolsBatch to reuse logic
        if (!req.body) req.body = {};
        req.body.schools = rawSchools;
        return updateSchoolsBatch(req, res);
    } catch (err) {
        console.error('[Sync] Google Sheet sync failed:', err.message);
        res.status(500).json({ message: 'Sync failed: ' + err.message });
    }
};

export const syncExternal = async (req, res) => {
    const { reports } = req.body;
    if (!reports || !Array.isArray(reports)) {
        return res.status(400).json({ message: 'Invalid reports data' });
    }

    try {
        const webhookUrl = process.env.N8N_WEBHOOK_SYNC_URL || process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            return res.status(500).json({ message: 'N8N Webhook URL not configured' });
        }

        const data = reports.map(r => ({
            schoolId: r.schoolId,
            schoolName: r.schoolName,
            assessmentName: r.assessmentName,
            qp: r.qp || '',
            studentCount: r.studentCount,
            status: r.status,
            isNotified: r.isEmailSent ? 'YES' : 'NO',
            timestamp: new Date().toISOString()
        }));

        await axios.post(webhookUrl, {
            action: 'SYNC_DASHBOARD',
            reports: data
        });

        res.json({ message: 'Dashboard data synced to PSA Tracker successfully' });
    } catch (error) {
        console.error('Error syncing external:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
};
