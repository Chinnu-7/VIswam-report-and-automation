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

        // Sync models
        const syncOptions = { alter: process.env.NODE_ENV !== 'production' };
        await sequelize.sync(syncOptions);
        console.log('Database models synced');

        await seedAdmin();
        console.log('Admin user seeding check complete');
        isDbInitialized = true;
    } catch (err) {
        console.error('CRITICAL: Database initialization failed!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.original) {
            console.error('Original Error:', err.original.message);
        }
        // Do not block the entire app if DB is briefly down, let next request retry
        isDbInitialized = false;
    }
};


// Health check (isolate from DB middleware) - No DB required
app.get('/api', (req, res) => {
    res.json({
        message: 'Viswam Report Card Automation API is running',
        dbInitialized: isDbInitialized,
        version: 'v1.0.9-debug-db',
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
        await initializeDb();
    } catch (err) {
        console.error('Middleware Error:', err);
    } finally {
        clearTimeout(timeout);
        next();
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
