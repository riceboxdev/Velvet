const { clerkClient } = require('@clerk/express');
const User = require('../models/User');

/**
 * Verify Clerk session token and attach user to request
 * Replaces Firebase authenticateToken middleware
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid Bearer token'
        });
    }

    const token = authHeader.substring(7);

    try {
        // Verify the Clerk session token
        const { sub: userId } = await clerkClient.verifyToken(token);

        if (!userId) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token verification failed'
            });
        }

        // Fetch user from database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                message: 'The user associated with this token does not exist in the database'
            });
        }

        if (user.is_active === false) {
            return res.status(401).json({
                error: 'Account disabled',
                message: 'This account has been disabled'
            });
        }

        req.user = user;
        req.auth = { userId };
        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);

        if (error.message?.includes('expired')) {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired, please log in again'
            });
        }

        return res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid',
            details: error.message
        });
    }
}

/**
 * Verify Clerk token ONLY (User doc optional)
 * Used for /me and /create-user to handle auto-creation
 */
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid Bearer token'
        });
    }

    const token = authHeader.substring(7);

    try {
        const { sub: userId } = await clerkClient.verifyToken(token);

        if (!userId) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token verification failed'
            });
        }

        const user = await User.findById(userId);
        req.auth = { userId };
        req.user = user; // May be null
        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);

        if (error.message?.includes('expired')) {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired, please log in again'
            });
        }

        return res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid',
            details: error.message
        });
    }
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const { sub: userId } = await clerkClient.verifyToken(token);

            if (userId) {
                const user = await User.findById(userId);
                if (user && user.is_active !== false) {
                    req.user = user;
                    req.auth = { userId };
                }
            }
        } catch (error) {
            // Token invalid, but that's okay for optional auth
        }
    }

    next();
}

/**
 * Authenticate API key (for external API access)
 * Used for public API endpoints like signup widget
 */
async function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'Please provide an API key in the X-API-Key header'
        });
    }

    const Waitlist = require('../models/Waitlist');
    const waitlist = await Waitlist.findByApiKey(apiKey);

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
 * Validate that the user owns the waitlist
 * Must be used after authenticateToken
 */
async function validateWaitlistOwnership(req, res, next) {
    const waitlistId = req.params.waitlistId || req.params.id;

    if (!waitlistId) {
        return res.status(400).json({
            error: 'Waitlist ID required',
            message: 'Please provide a waitlist ID'
        });
    }

    const Waitlist = require('../models/Waitlist');
    const waitlist = await Waitlist.findById(waitlistId);

    if (!waitlist) {
        return res.status(404).json({
            error: 'Waitlist not found',
            message: 'The specified waitlist does not exist'
        });
    }

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
 */
async function validateWaitlistId(req, res, next) {
    const waitlistId = req.params.waitlistId || req.params.id;

    if (!waitlistId) {
        return res.status(400).json({
            error: 'Waitlist ID required',
            message: 'Please provide a waitlist ID'
        });
    }

    const Waitlist = require('../models/Waitlist');
    const waitlist = await Waitlist.findById(waitlistId);

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
    verifyToken,
    authenticateApiKey,
    optionalAuth,
    validateWaitlistOwnership,
    validateWaitlistId
};
