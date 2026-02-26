const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');

// Local DB Config
const localSequelize = new Sequelize('viswam_reports', 'root', '2500', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

// Remote DB Config
const remoteSequelize = new Sequelize('sql12818186', 'sql12818186', 'SRnuSz4jkQ', {
    host: 'sql12.freesqldatabase.com',
    dialect: 'mysql',
    port: 3306,
    logging: false
});

const defineModels = (sequelize) => {
    const User = sequelize.define('User', {
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.ENUM('admin', 'principal'), defaultValue: 'principal' },
        schoolId: { type: DataTypes.STRING, allowNull: true }
    });

    const StudentReport = sequelize.define('StudentReport', {
        studentId: { type: DataTypes.STRING, allowNull: false },
        studentName: { type: DataTypes.STRING, allowNull: false },
        className: { type: DataTypes.STRING, allowNull: false },
        section: { type: DataTypes.STRING, allowNull: false },
        examType: { type: DataTypes.STRING, allowNull: false },
        academicYear: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
        schoolId: { type: DataTypes.STRING, allowNull: false }
    });

    const Grade = sequelize.define('Grade', {
        subject: { type: DataTypes.STRING, allowNull: false },
        marks: { type: DataTypes.INTEGER, allowNull: true },
        grade: { type: DataTypes.STRING, allowNull: true },
        type: { type: DataTypes.STRING, allowNull: false },
        reportId: { type: DataTypes.INTEGER }
    });

    const LearningOutcome = sequelize.define('LearningOutcome', {
        subject: { type: DataTypes.STRING, allowNull: false },
        outcome: { type: DataTypes.TEXT, allowNull: false },
        rating: { type: DataTypes.STRING, allowNull: false },
        reportId: { type: DataTypes.INTEGER }
    });

    return { User, StudentReport, Grade, LearningOutcome };
};

async function migrate() {
    try {
        console.log('Connecting to databases...');
        await localSequelize.authenticate();
        await remoteSequelize.authenticate();
        console.log('Connected.');

        const localModels = defineModels(localSequelize);
        const remoteModels = defineModels(remoteSequelize);

        // Migrate Users (excluding seeded admin if exists)
        console.log('Migrating Users...');
        const users = await localModels.User.findAll();
        for (const user of users) {
             const [remoteUser, created] = await remoteModels.User.findOrCreate({
                 where: { email: user.email },
                 defaults: user.toJSON()
             });
             if (created) console.log(`Migrated user: ${user.email}`);
        }

        // Migrate Reports and their details
        console.log('Migrating StudentReports...');
        const reports = await localModels.StudentReport.findAll();
        for (const report of reports) {
            // Check if report already exists (simplified check)
            const exists = await remoteModels.StudentReport.findOne({ 
                where: { 
                    studentId: report.studentId, 
                    examType: report.examType, 
                    academicYear: report.academicYear 
                } 
            });

            if (!exists) {
                const newReport = await remoteModels.StudentReport.create(report.toJSON());
                console.log(`Migrated report for: ${report.studentName}`);

                // Migrate Grades
                const grades = await localModels.Grade.findAll({ where: { reportId: report.id } });
                for (const grade of grades) {
                    const gradeData = grade.toJSON();
                    delete gradeData.id;
                    gradeData.reportId = newReport.id;
                    await remoteModels.Grade.create(gradeData);
                }

                // Migrate LOs
                const los = await localModels.LearningOutcome.findAll({ where: { reportId: report.id } });
                for (const lo of los) {
                    const loData = lo.toJSON();
                    delete loData.id;
                    loData.reportId = newReport.id;
                    await remoteModels.LearningOutcome.create(loData);
                }
            }
        }

        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await localSequelize.close();
        await remoteSequelize.close();
    }
}

migrate();
