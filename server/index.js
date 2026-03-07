import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
// Import routes
import apiRoutes from './routes/api.js';

import { seedAdmin } from './controllers/authController.js';
import User from './models/User.js';
import StudentReport from './models/StudentReport.js';
import SchoolInfo from './models/SchoolInfo.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection & Sync status
let isDbInitialized = false;

const initializeDb = async () => {
    if (isDbInitialized) return;
    try {
        console.log('Starting Database initialization...');
        await sequelize.authenticate();
        console.log('Database connection authenticated successfully');

        // Only sync if strictly necessary or in development
        // For production Vercel, we should avoid 'alter: true' on every cold start
        if (process.env.NODE_ENV !== 'production') {
            await User.sync({ alter: false });
            await SchoolInfo.sync({ alter: true });
            await StudentReport.sync({ alter: false });
            console.log('Database models synced (Development mode)');
        } else {
            // In production, just ensure tables exist without 'alter'
            // This is much safer and faster
            await User.sync();
            await SchoolInfo.sync();
            console.log('Database connection validated');
        }

        await seedAdmin();
        isDbInitialized = true;
    } catch (err) {
        console.error('CRITICAL: Database initialization failed!');
        console.error('Error:', err.message);
        isDbInitialized = false;
        // Re-throw to let the middleware handle it
        throw err;
    }
};


// Health check (isolate from DB middleware) - No DB required
app.get('/api', (req, res) => {
    res.json({
        message: 'Viswam Report Card Automation API is running',
        dbInitialized: isDbInitialized,
        version: 'v1.1.0-optimized',
        timestamp: new Date().toISOString()
    });
});

// Middleware to ensure DB is ready - REQUIRED for all subsequent routes
app.use(async (req, res, next) => {
    // Basic timeout to prevent 502 crash if DB hangs
    const timeout = setTimeout(() => {
        if (!isDbInitialized) console.log('DB Init still pending...');
    }, 5000);

    try {
        // Enforce a strict 3-second timeout so Vercel doesn't kill the request 
        // before our login bypass can activate
        await Promise.race([
            initializeDb(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 3000))
        ]);
        clearTimeout(timeout);
        next();
    } catch (err) {
        clearTimeout(timeout);
        console.error('Middleware Error:', err.message);
        // FORCE BYPASS for Authentication and Sync Routes so the admin fallback works
        if (req.path.includes('/auth/login') || req.path.includes('/schools/sync') || req.path.includes('/reports/sync-external')) {
            console.log('Bypassing DB check for bypassed route:', req.path);
            return next();
        }
        res.status(503).json({ message: 'Database initialization failed', error: err.message });
    }
});

// App Routes (Needs DB)
app.use('/api', apiRoutes);



// Serve static files in production
const distPath = path.resolve('dist');
app.use(express.static(distPath));

// Catch-all to serve index.html for SPA
app.get('*all', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});


// Conditionally listen for local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.NETLIFY) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
