import StudentReport from './StudentReport.js';
import SchoolInfo from './SchoolInfo.js';
import User from './User.js';

// StudentReport belongs to SchoolInfo (using schoolId as foreign key)
StudentReport.belongsTo(SchoolInfo, { foreignKey: 'schoolId', targetKey: 'schoolId' });
SchoolInfo.hasMany(StudentReport, { foreignKey: 'schoolId', sourceKey: 'schoolId' });

// User (Principal) belongs to SchoolInfo
User.belongsTo(SchoolInfo, { foreignKey: 'schoolId', targetKey: 'schoolId' });
SchoolInfo.hasMany(User, { foreignKey: 'schoolId', sourceKey: 'schoolId' });

export { StudentReport, SchoolInfo, User };
