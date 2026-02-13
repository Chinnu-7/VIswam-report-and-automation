import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (user && (await user.comparePassword(password))) {
            res.json({
                id: user.id,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
                token: generateToken(user.id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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
