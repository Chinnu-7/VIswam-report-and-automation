import Sequelize from 'sequelize';
import db from '../config/database.js';

const StudentReport = db.define('student_report', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    studentName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    rollNo: {
        type: Sequelize.STRING,
        allowNull: true
    },
    schoolId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    schoolName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    assessmentName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    qp: {
        type: Sequelize.STRING,
        allowNull: true
    },
    class: {
        type: Sequelize.STRING,
        allowNull: true
    },
    section: {
        type: Sequelize.STRING,
        allowNull: true
    },
    status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    reportData: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Stores M1-M15, E1-E15, S1-S15 and other calculated values'
    },
    isEmailSent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});

export default StudentReport;
