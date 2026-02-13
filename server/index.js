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
        console.log('Database connected...');
        await sequelize.sync({ alter: true });
        console.log('Models synced');
        await seedAdmin();
        isDbInitialized = true;
    } catch (err) {
        console.error('Database initialization error:', err);
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
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

// Conditionally listen for local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
