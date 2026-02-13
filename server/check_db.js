import StudentReport from './models/StudentReport.js';

const checkData = async () => {
    try {
        const count = await StudentReport.count();
        console.log(`Total Student Reports: ${count}`);
    } catch (error) {
        console.error('Error checking data:', error);
    }
};

checkData();
