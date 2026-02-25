import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import User from '../models/User.js';
import axios from 'axios';
import { Op } from 'sequelize';
import * as gradingService from '../services/gradingService.js';

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

    for (const updated of updatedReports) {
        await StudentReport.update(
            { reportData: updated.reportData },
            { where: { id: updated.id } }
        );
    }
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

        const reports = await StudentReport.findAll({ where });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
};

export const getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await StudentReport.findByPk(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ message: 'Error fetching report' });
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
        const approvedReports = await StudentReport.findAll({
            where: { id: { [Op.in]: ids } }
        });

        // Group by School ID
        const reportsBySchool = approvedReports.reduce((acc, report) => {
            if (!acc[report.schoolId]) {
                acc[report.schoolId] = [];
            }
            acc[report.schoolId].push(report);
            return acc;
        }, {});

        const triggerResults = [];

        for (const [schoolId, reports] of Object.entries(reportsBySchool)) {
            // Get Principal Email
            const school = await SchoolInfo.findOne({ where: { schoolId } });
            const principalEmail = school ? school.principalEmail : null;
            const schoolName = school ? school.schoolName : 'Unknown School';

            if (principalEmail) {
                // Trigger n8n with LIST of students
                try {
                    await axios.post(process.env.N8N_WEBHOOK_URL, {
                        schoolId,
                        schoolName,
                        principalEmail,
                        students: reports.map(r => ({
                            id: r.id,
                            name: r.studentName,
                            rollNo: r.rollNo,
                            class: r.class,
                            reportData: r.reportData // Includes M1-M15, calculated scores needed?
                        }))
                    });
                    triggerResults.push({ schoolId, status: 'Triggered', count: reports.length });
                } catch (err) {
                    console.error(`Failed to trigger n8n for school ${schoolId}:`, err.message);
                    triggerResults.push({ schoolId, status: 'Failed', error: err.message });
                }
            } else {
                console.warn(`No principal email found for school ${schoolId}`);
                triggerResults.push({ schoolId, status: 'No Email Found' });
            }
        }

        res.json({ message: 'Reports approved and grouped triggers initiated', results: triggerResults });

    } catch (error) {
        console.error('Error approving reports:', error);
        res.status(500).json({ message: 'Error approving reports' });
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

// Automation Queue for n8n (Polling)
export const getAutomationQueue = async (req, res) => {
    try {
        const reports = await StudentReport.findAll({
            where: {
                status: 'APPROVED',
                isEmailSent: false
            }
        });

        if (reports.length === 0) {
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
        await SchoolInfo.bulkCreate(schools, {
            updateOnDuplicate: ['schoolName', 'principalEmail', 'whatsappNo']
        });

        // Also ensure user accounts exist for these principals
        for (const school of schools) {
            const [user, created] = await User.findOrCreate({
                where: { email: school.principalEmail },
                defaults: {
                    password: `${school.schoolId}@123`,
                    role: 'principal',
                    schoolId: school.schoolId
                }
            });
            if (!created) {
                user.schoolId = school.schoolId;
                await user.save();
            }
        }

        res.json({ message: `Successfully synced ${schools.length} schools from Google Sheets` });
    } catch (error) {
        console.error('Error syncing schools:', error);
        res.status(500).json({ message: 'Error syncing schools', error: error.message });
    }
};
