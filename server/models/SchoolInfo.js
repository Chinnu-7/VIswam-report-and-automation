import Sequelize from 'sequelize';
import db from '../config/database.js';

const SchoolInfo = db.define('school_info', {
    schoolId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
    },
    schoolName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    principalEmail: {
        type: Sequelize.STRING,
        allowNull: false
    },
    whatsappNo: {
        type: Sequelize.STRING,
        allowNull: true
    }
});

export default SchoolInfo;
