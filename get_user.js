import dotenv from 'dotenv';
import sequelize from './server/config/database.js';
import User from './server/models/User.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import { Op } from 'sequelize';

dotenv.config();

async function run() {
    try {
        await sequelize.authenticate();

        const schoolQuery = await SchoolInfo.findAll({
            where: { schoolId: '572834' }
        });
        console.log('School Info (572834):', JSON.stringify(schoolQuery, null, 2));

        const userQuery = await User.findAll({
            where: { schoolId: '572834' }
        });
        console.log('Users (572834):', JSON.stringify(userQuery, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
