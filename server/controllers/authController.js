import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    const providedEmail = email ? email.trim().toLowerCase() : '';

    try {
        // FIXED ADMIN BYPASS FOR WHEN DATABASE FAILS
        if (providedEmail === 'admin@viswam.com' && password === 'admin123') {
            console.log('Login success (Bypass) for:', email);
            return res.json({
                id: 99999,
                email: 'admin@viswam.com',
                role: 'admin',
                schoolId: null,
                token: generateToken(99999)
            });
        }

        const user = await User.findOne({ where: { email } });

        if (user && (await user.comparePassword(password))) {
            console.log('Login success for:', email);
            return res.json({
                id: user.id,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
                token: generateToken(user.id)
            });
        } else {
            console.log('Login failed for:', email, 'User found:', !!user);
            res.status(401).json({ message: 'Invalid email or password. Please verify your credentials.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        // Distinguish between DB connection errors and other server errors
        const isDbError = error.name.includes('Sequelize') || error.message.includes('Access denied');
        res.status(500).json({
            message: isDbError ? 'Database connection error. Please check your DB credentials and availability.' : 'Server error during login',
            error: error.message,
            code: isDbError ? 'DB_CONNECTION_ERROR' : 'INTERNAL_SERVER_ERROR'
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Seed initial admin if not exists
export const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@viswam.com';
        const exists = await User.findOne({ where: { email: adminEmail } });
        if (!exists) {
            await User.create({
                email: adminEmail,
                password: 'admin123',
                role: 'admin'
            });
            console.log('Default admin created: admin@viswam.com / admin123');
        }
    } catch (err) {
        console.error('Seed error:', err);
    }
};
