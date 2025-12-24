const express = require('express');
const router = express.Router();
const { authenticateToken: verifyToken } = require('../middleware/auth');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/settings/theme
 * Get current theme settings
 */
router.get('/theme', async (req, res) => {
    try {
        const theme = await SystemSettings.get('theme');
        res.json({
            success: true,
            data: { theme: theme ? JSON.parse(theme) : null }
        });
    } catch (error) {
        console.error('[Settings] Get theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/settings/theme
 * Update theme settings (admin only)
 */
router.put('/theme', async (req, res) => {
    try {
        // req.user is already the full user object from authenticateToken middleware
        if (!req.user?.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { theme } = req.body;
        await SystemSettings.set('theme', theme, req.user.id);

        res.json({
            success: true,
            message: 'Theme updated'
        });
    } catch (error) {
        console.error('[Settings] Update theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/settings/all
 * Get all settings (admin only)
 */
router.get('/all', async (req, res) => {
    try {
        // req.user is already the full user object from authenticateToken middleware
        if (!req.user?.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const settings = await SystemSettings.getAll();
        res.json({
            success: true,
            data: { settings }
        });
    } catch (error) {
        console.error('[Settings] Get all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
