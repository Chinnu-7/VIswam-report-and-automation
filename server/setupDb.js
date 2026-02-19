import sequelize from './config/database.js';
import './models/StudentReport.js';
import './models/SchoolInfo.js';
import './models/User.js';


async function setupDatabase() {
    try {
        console.log('Synchronizing database models...');
        await sequelize.sync({ force: false }); // Change to true if you want to reset tables
        console.log('Database synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error synchronizing database:', error);
        process.exit(1);
    }
}

setupDatabase();
