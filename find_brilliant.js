import { Sequelize, DataTypes, Op } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false
    }
);

const SchoolInfo = sequelize.define('SchoolInfo', {
    schoolId: { type: DataTypes.STRING, primaryKey: true },
    schoolName: { type: DataTypes.STRING }
}, {
    tableName: 'SchoolInfo',
    timestamps: false
});

async function findSchool() {
    try {
        await sequelize.authenticate();
        const schools = await SchoolInfo.findAll({
            where: {
                schoolName: {
                    [Op.like]: '%Brilliant%'
                }
            }
        });
        console.log('Found schools:', schools.map(s => s.toJSON()));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

findSchool();
