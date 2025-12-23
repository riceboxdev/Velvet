const { auth } = require('../config/firebase');

/**
 * Middleware to verify Firebase ID tokens
 * Extracts user info and attaches to req.user
 */
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
        });
    }

    const idToken = authHeader.substring(7);

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
        };
        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error.code);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
}

/**
 * Optional auth - attaches user if token provided, but doesn't require it
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const idToken = authHeader.substring(7);

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
        };
    } catch (error) {
        req.user = null;
    }
    next();
}

module.exports = { verifyToken, optionalAuth };
