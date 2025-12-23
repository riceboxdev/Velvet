const express = require('express');
const router = express.Router();
const { authenticateToken: verifyToken } = require('../middleware/auth');
const Waitlist = require('../models/Waitlist');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/waitlists
 * Get all waitlists for the current user
 */
router.get('/', async (req, res) => {
    try {
        const waitlists = await Waitlist.findByUserId(req.user.uid);

        // Get stats for each waitlist
        const waitlistsWithStats = await Promise.all(
            waitlists.map(async (wl) => {
                const stats = await Waitlist.getStats(wl.id);
                return { ...wl, stats };
            })
        );

        res.json({
            success: true,
            data: { waitlists: waitlistsWithStats }
        });
    } catch (error) {
        console.error('[Waitlists] Get all error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/waitlists
 * Create a new waitlist
 */
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const waitlist = await Waitlist.create({
            name,
            description: description || '',
            userId: req.user.uid
        });

        const stats = await Waitlist.getStats(waitlist.id);

        res.status(201).json({
            success: true,
            data: { waitlist: { ...waitlist, stats } }
        });
    } catch (error) {
        console.error('[Waitlists] Create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/waitlists/:id
 * Get a specific waitlist
 */
router.get('/:id', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.user.uid) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stats = await Waitlist.getStats(waitlist.id);

        res.json({
            success: true,
            data: { waitlist: { ...waitlist, stats } }
        });
    } catch (error) {
        console.error('[Waitlists] Get one error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/waitlists/:id
 * Update a waitlist
 */
router.put('/:id', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.user.uid) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, description, settings, is_active } = req.body;
        const updated = await Waitlist.update(req.params.id, { name, description, settings, is_active });
        const stats = await Waitlist.getStats(updated.id);

        res.json({
            success: true,
            data: { waitlist: { ...updated, stats } }
        });
    } catch (error) {
        console.error('[Waitlists] Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/waitlists/:id
 * Delete a waitlist
 */
router.delete('/:id', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.user.uid) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Waitlist.delete(req.params.id);

        res.json({
            success: true,
            message: 'Waitlist deleted'
        });
    } catch (error) {
        console.error('[Waitlists] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/waitlists/:id/regenerate-key
 * Regenerate API key
 */
router.post('/:id/regenerate-key', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.user.uid) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await Waitlist.regenerateApiKey(req.params.id);

        res.json({
            success: true,
            data: { api_key: updated.api_key }
        });
    } catch (error) {
        console.error('[Waitlists] Regenerate key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
