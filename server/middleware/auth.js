const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authenticate JWT token
 * Adds req.user with the authenticated user
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid Bearer token'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                message: 'The user associated with this token no longer exists'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                error: 'Account disabled',
                message: 'This account has been disabled'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired, please log in again'
            });
        }

        return res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid'
        });
    }
}

/**
 * Authenticate API key (for external API access)
 * Used for public API endpoints like signup widget
 */
function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'Please provide an API key in the X-API-Key header'
        });
    }

    const waitlist = Waitlist.findByApiKey(apiKey);

    if (!waitlist) {
        return res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }

    req.waitlist = waitlist;
    next();
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = User.findById(decoded.id);
            if (user && user.is_active) {
                req.user = user;
            }
        } catch (error) {
            // Token invalid, but that's okay for optional auth
        }
    }

    next();
}

/**
 * Validate that the user owns the waitlist
 * Must be used after authenticateToken
 * Expects waitlistId in req.params
 */
function validateWaitlistOwnership(req, res, next) {
    const waitlistId = req.params.waitlistId || req.params.id;

    if (!waitlistId) {
        return res.status(400).json({
            error: 'Waitlist ID required',
            message: 'Please provide a waitlist ID'
        });
    }

    const waitlist = Waitlist.findById(waitlistId);

    if (!waitlist) {
        return res.status(404).json({
            error: 'Waitlist not found',
            message: 'The specified waitlist does not exist'
        });
    }

    // Check ownership - allow if user owns it OR if waitlist has no owner (migration)
    if (waitlist.user_id && waitlist.user_id !== req.user.id) {
        return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to access this waitlist'
        });
    }

    req.waitlist = waitlist;
    next();
}

/**
 * Validate waitlist ID exists (for public routes)
 * Expects waitlistId in req.params
 */
function validateWaitlistId(req, res, next) {
    const waitlistId = req.params.waitlistId || req.params.id;

    if (!waitlistId) {
        return res.status(400).json({
            error: 'Waitlist ID required',
            message: 'Please provide a waitlist ID'
        });
    }

    const waitlist = Waitlist.findById(waitlistId);

    if (!waitlist) {
        return res.status(404).json({
            error: 'Waitlist not found',
            message: 'The specified waitlist does not exist'
        });
    }

    req.waitlist = waitlist;
    next();
}

module.exports = {
    authenticateToken,
    authenticateApiKey,
    optionalAuth,
    validateWaitlistOwnership,
    validateWaitlistId
};
