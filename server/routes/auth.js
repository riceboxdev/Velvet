const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticateToken, verifyToken } = require('../middleware/clerk');

/**
 * POST /api/auth/create-user
 * Create user document after Clerk signup (called from client)
 */
router.post('/create-user', verifyToken, async (req, res) => {
    try {
        const { name = '', email } = req.body;
        const { userId } = req.auth; // From Clerk middleware

        // Check if user already exists
        let user = req.user; // From middleware

        if (!user) {
            // Create new user document
            user = await User.create({
                id: userId,
                email: email,
                name
            });
            console.log(`[Auth] New user created: ${email}`);
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
        const { userId } = req.auth;

        if (!user) {
            // We need the email from the request or Clerk
            // For now, return null and let the client create the user
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User document does not exist. Please call /create-user first.'
            });
        }

        // Update last login
        await User.updateLastLogin(userId);

        // Get subscription info (plan + limits)
        const subscription = await Subscription.getUserLimits(userId);

        res.json({
            success: true,
            data: {
                user,
                subscription
            }
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
        const { name, email, bio, website, company, photo_url } = req.body;
        const { userId } = req.auth;

        const user = await User.update(userId, {
            name,
            email,
            bio,
            website,
            company,
            photo_url
        });

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
