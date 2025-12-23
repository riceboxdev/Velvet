const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to require admin access
 * Must be used after authentication
 */
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found'
            });
        }

        if (!user.is_admin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }

        // Attach user to request for downstream handlers
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }
}

module.exports = requireAdmin;
