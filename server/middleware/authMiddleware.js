import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }
            });

            if (!req.user) {
                console.error(`Auth Error: User not found for ID ${decoded.id}`);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error('Auth Error:', error.message);
            const message = error.name === 'TokenExpiredError'
                ? 'Not authorized, token expired'
                : 'Not authorized, token failed';
            res.status(401).json({ message });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

export const principalOnly = (req, res, next) => {
    if (req.user && req.user.role === 'principal') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as a principal' });
    }
};

export const principalOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'principal' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized' });
    }
};
