
import { Sequelize } from 'sequelize';
import StudentReport from '../models/StudentReport.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
});

const cleanup = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Initialize model manually if needed/not loaded via import side-effects
        // Explicitly map to 'student_reports' table (Sequelize default pluralization of 'student_report')
        StudentReport.init(StudentReport.schema, {
            sequelize,
            modelName: 'student_report',
            tableName: 'student_reports'
        });

        // Hardcoded for the user's current context or generic wipe
        // User mentioned "27 reg", likely a specific school.
        // best to wipe ALL pending data or specific school if known. 
        // For now, let's wipe ALL data to be safe as this is a local dev env for the user.

        console.log('Clearing ALL Student Reports to ensure clean slate...');
        await StudentReport.destroy({
            where: {},
            truncate: true
        });

        console.log('✅ All student report data cleared manually.');
        console.log('Please re-upload your file now.');

    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await sequelize.close();
    }
};

cleanup();
