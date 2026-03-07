import dotenv from 'dotenv';
import sequelize from './server/config/database.js';
import User from './server/models/User.js';
import SchoolInfo from './server/models/SchoolInfo.js';
import StudentReport from './server/models/StudentReport.js';

dotenv.config();

async function setup() {
    try {
        await sequelize.authenticate();

        const schoolId = '572834';
        const email = 'Mpradeepkumar671@gmail.com';
        const phone = '8106271906';

        await SchoolInfo.upsert({
            schoolId: schoolId,
            schoolName: 'Smart Kennady school',
            principalEmail: email,
            whatsappNo: phone
        });

        // Also update any existing user that might have been created with the old email
        const oldEmailUser = await User.findOne({ where: { email: 'prathima@kennady.edu' } });
        if (oldEmailUser) {
            await oldEmailUser.destroy();
        }

        const [user, created] = await User.findOrCreate({
            where: { email: email },
            defaults: {
                password: 'password123',
                role: 'principal',
                schoolId: schoolId
            }
        });

        if (!created) {
            user.password = 'password123';
            await user.save();
        }

        await StudentReport.destroy({ where: { schoolId } });

        await StudentReport.create({
            rollNo: 'SK001',
            studentName: 'Sample Student',
            schoolId: schoolId,
            schoolName: 'Smart Kennady school',
            assessmentName: 'Sample Assessment 1',
            class: '10',
            status: 'PENDING',
            reportData: {
                maths: { m1: 1, m2: 0 },
                science: { s1: 1, s2: 1 },
                english: { E1: 1, E2: 0 },
                maths_score: 50,
                science_score: 100,
                english_score: 50,
                lo_mapping: {
                    maths: { m1: "Maths 1", m2: "Maths 2" },
                    science: { s1: "Science 1", s2: "Science 2" },
                    english: { E1: "English 1", E2: "English 2" }
                }
            }
        });

        console.log('Setup complete! Credentials updated:');
        console.log(`Email: ${email}`);
        console.log(`Password: password123`);
        console.log(`WhatsApp: ${phone}`);

        process.exit(0);
    } catch (e) {
        console.error('Setup failed:', e);
        process.exit(1);
    }
}
setup();
