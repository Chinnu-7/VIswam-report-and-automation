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

        // Only sync if strictly necessary or in development
        // For production Vercel, we should avoid 'alter: true' on every cold start
        if (process.env.NODE_ENV !== 'production') {
            await SchoolInfo.sync({ alter: true });
            await User.sync({ alter: true });
            await StudentReport.sync({ alter: false });
            console.log('Database models synced (Development mode)');
        } else {
            // In production, just verify the connection and optionally do a basic sync.
            // ORDER MATTERS: SchoolInfo must be synced first as others reference it.
            await SchoolInfo.sync();
            await User.sync();
            await StudentReport.sync();
            console.log('Database connection and tables synced (Production mode)');
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
        version: 'v1.2.0-supabase',
        timestamp: new Date().toISOString()
    });
});

// Debug route to see the EXACT DB error (helpful for credentials/DNS checks)
app.get('/api/debug-db', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ success: true, message: 'Database connection authenticated successfully' });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            name: err.name,
            code: err.original ? err.original.code : null,
            env_check: {
                DATABASE_URL_SET: !!process.env.DATABASE_URL,
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL
            }
        });
    }
});

// Debug route to check visible files (to fix Answer Key XLSX resolution on Vercel)
app.get('/api/debug-files', (req, res) => {
    const checkDir = (dir) => {
        try {
            return fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
        } catch (e) {
            return e.message;
        }
    };

    res.json({
        cwd: {
            path: process.cwd(),
            files: checkDir(process.cwd())
        },
        dirname: {
            path: __dirname,
            files: checkDir(__dirname)
        },
        dirnameParent2: {
            path: path.resolve(__dirname, '../../'),
            files: checkDir(path.resolve(__dirname, '../../'))
        },
        dirnameParent3: {
            path: path.resolve(__dirname, '../../../'),
            files: checkDir(path.resolve(__dirname, '../../../'))
        },
        varTask: {
            path: '/var/task',
            files: checkDir('/var/task')
        }
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
        // FORCE BYPASS for Authentication ONLY
        if (req.path.includes('/auth/login')) {
            console.log('Bypassing DB check for Login only:', req.path);
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


// Enable listener for standard cloud hosting (Jio/Azure, Render, etc.)
// Serverless (Vercel/Netlify) doesn't require manual listen()
if (!process.env.VERCEL && !process.env.NETLIFY) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
