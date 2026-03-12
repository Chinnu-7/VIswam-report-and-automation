import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
});

async function checkReports() {
  try {
    const [results] = await sequelize.query(`
      SELECT "schoolId", "schoolName", "assessmentName", status, "isEmailSent", COUNT(*) as count 
      FROM "StudentReports" 
      WHERE "schoolId" = '572834'
      GROUP BY "schoolId", "schoolName", "assessmentName", status, "isEmailSent"
    `);
    console.log(JSON.stringify(results, null, 2));
    
    const [student] = await sequelize.query(`
      SELECT * FROM "StudentReports" WHERE "schoolId" = '572834' LIMIT 1
    `);
    console.log("Full Student Record Sample:");
    console.log(JSON.stringify(student, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkReports();
