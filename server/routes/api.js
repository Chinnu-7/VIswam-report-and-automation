import express from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/uploadController.js';
import * as adminController from '../controllers/adminController.js';
import * as authController from '../controllers/authController.js';
import * as renderController from '../controllers/renderController.js';
import { protect, adminOnly, principalOnly, principalOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage(); // Store in memory to parse immediately
const upload = multer({ storage: storage });

// Auth Routes
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// Routes
// Upload Student Data Excel (Principal or Admin)
router.post('/upload/students', protect, principalOrAdmin, upload.single('file'), uploadController.uploadStudentData);

// Upload School Data Excel (Admin only)
router.post('/upload/schools', protect, adminOnly, upload.single('file'), uploadController.uploadSchoolData);

// Admin Routes (Admin only)
router.get('/reports/:id', protect, adminController.getReportById); // Get single report by ID
router.get('/reports', protect, adminController.getReports); // Get all or filter by status
router.post('/reports/approve', protect, adminOnly, adminController.approveReports); // Approve list of IDs
router.post('/reports/reject', protect, adminOnly, adminController.rejectReports); // Reject list of IDs
router.post('/reports/recalculate', protect, adminOnly, adminController.recalculateGrades); // Recalculate cohort grades
router.delete('/reports', protect, adminOnly, adminController.deleteReports); // Delete list of IDs

// Automation Queue (Polling for n8n)
router.get('/reports/automation/queue', adminController.getAutomationQueue);
router.post('/reports/automation/mark-sent', adminController.markAsSent);

// School Sync
router.post('/schools/sync', adminController.updateSchoolsBatch);

// Render Route (Public for n8n/Api2Pdf, or could be protected if needed)
router.get('/reports/:id/render', renderController.renderReportHtml);

// TEMP: Diagnostic route
router.get('/db-status', async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const count = await User.count();
        const admin = await User.findOne({ where: { email: 'admin@viswam.com' } });
        res.json({
            status: 'connected',
            userCount: count,
            adminExists: !!admin,
            envUrlPresent: !!(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL)
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});


export default router;
