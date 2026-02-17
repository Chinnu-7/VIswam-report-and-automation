import User from './server/models/User.js';
import sequelize from './server/config/database.js';

async function testLogin() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        const email = 'admin@viswam.com';
        const password = 'admin123';

        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log('User found, comparing password...');
        const isMatch = await user.comparePassword(password);
        console.log('Password match:', isMatch);

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}
testLogin();
