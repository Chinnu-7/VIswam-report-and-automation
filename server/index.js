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
import './models/associations.js';

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

        // SECURITY/STABILITY: Disable 'alter' sync in production by default.
        // But if this is a fresh database (no Users table), we MUST run sync once to create the schema.
        try {
            await User.findOne();
            console.log('Database tables verified');
        } catch (e) {
            console.log('Database tables missing or empty. Running initial sync...');
            await SchoolInfo.sync({ alter: true });
            await User.sync({ alter: true });
            await StudentReport.sync({ alter: true });
            console.log('Initial sync complete');
        }

        if (process.env.NODE_ENV !== 'production' && process.env.FORCE_DB_SYNC === 'true') {
            console.log('Forced sync triggered (FORCE_DB_SYNC is true)...');
            await SchoolInfo.sync({ alter: true });
            await User.sync({ alter: true });
            await StudentReport.sync({ alter: true });
            console.log('Database models synced');
        } else {
            console.log('Database connection verified (Sync skipped - Stable Mode)');
        }

        console.log('Database Admin account seeded');
        isDbInitialized = true;
        console.log('DB Initialization COMPLETED SUCCESSFULLY');
    } catch (err) {
        console.error('CRITICAL: Database initialization failed!');
        console.error('Error:', err.message);
        if (err.parent) console.error('Parent Error:', err.parent.message);
        isDbInitialized = false;
        throw err;
    }
};


// Health check (isolate from DB middleware) - No DB required
app.get('/api', (req, res) => {
    res.json({
        message: 'Viswam Report Card Automation API is running',
        dbInitialized: isDbInitialized,
        version: 'v1.2.5-hardened',
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
        // Increase timeout to 20 seconds for the remote MySQL connection/sync
        await Promise.race([
            initializeDb(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 20000))
        ]);
        clearTimeout(timeout);
        next();
    } catch (err) {
        clearTimeout(timeout);
        console.error('Middleware Error:', err.message);
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
    } else {
        res.status(404).json({ message: 'API Route Not Found' });
    }
});


// Enable listener for standard cloud hosting (Jio/Azure, Render, etc.)
// Serverless (Vercel/Netlify) doesn't require manual listen()
if (!process.env.VERCEL && !process.env.NETLIFY) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
