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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection & Sync status
let isDbInitialized = false;

const initializeDb = async () => {
    if (isDbInitialized) return;
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');

        // Sync models (only sync without alter in production for safety/speed)
        const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
        await sequelize.sync(syncOptions);
        console.log('Models synced');

        await seedAdmin();
        isDbInitialized = true;
    } catch (err) {
        console.error('CRITICAL: Database initialization failed:', err);
        // Do not block the entire app if DB is briefly down, let next request retry
        isDbInitialized = false;
    }
};


// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
    await initializeDb();
    next();
});

// Routes
app.use('/api', apiRoutes);

app.get('/api', (req, res) => {
    res.send('Viswam Report Card Automation API is running');
});

// Serve static files in production
const distPath = path.join(__dirname, '../dist');
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
