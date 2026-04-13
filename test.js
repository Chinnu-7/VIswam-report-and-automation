import sequelize from './server/config/database.js';

async function test() {
  const [results] = await sequelize.query('SELECT * FROM "SchoolInfos"');
  console.log(results.filter(r => r.schoolName && r.schoolName.toLowerCase().includes('little') || r.principalEmail && r.principalEmail.includes('Srisai')));
  process.exit(0);
}

test();
