import StudentReport from './server/models/StudentReport.js';
import User from './server/models/User.js';
import sequelize from './server/config/database.js';
import { seedAdmin } from './server/controllers/authController.js';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
    try {
        sequelize.options.logging = console.log;
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        const [tables] = await sequelize.query('SHOW TABLES');
        console.log('Tables in DB:', tables);

        await seedAdmin();
        console.log('SeedAdmin completed');

        const userCount = await User.count();
        console.log(`Total users in DB: ${userCount}`);

        const users = await User.findAll({ attributes: ['email', 'role'] });
        console.log('Users:', users.map(u => `${u.email} (${u.role})`));

        const reportCount = await StudentReport.count();
        console.log(`Total reports in DB: ${reportCount}`);

        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}
debug();
