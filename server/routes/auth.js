const express = require('express');
const router = express.Router();
const User = require('../models/User');


/**
 * POST /api/auth/create-user
 * Create user document after Firebase Auth signup (called from client)
 */
const { authenticateToken, verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/create-user
 * Create user document after Firebase Auth signup (called from client)
 */
router.post('/create-user', verifyToken, async (req, res) => {
    try {
        const { name = '' } = req.body;
        const decodedToken = req.auth; // From middleware

        // Check if user already exists
        let user = req.user; // From middleware

        if (!user) {
            // Create new user document
            user = await User.create({
                uid: decodedToken.uid,
                email: decodedToken.email,
                name
            });
            console.log(`[Auth] New user created: ${decodedToken.email}`);
        }

        res.status(201).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('[Auth] Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/me
 * Get current user (requires auth)
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        // User might be null if not created yet
        let user = req.user;
        const decodedToken = req.auth;

        if (!user) {
            // Auto-create user document if it doesn't exist
            user = await User.create({
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: ''
            });
        }

        // Update last login
        await User.updateLastLogin(decodedToken.uid);

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('[Auth] Get user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        const decodedToken = req.auth;

        const user = await User.update(decodedToken.uid, { name, email });

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('[Auth] Update profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/logout
 * Logout (mainly for tracking, actual logout is client-side)
 */
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
