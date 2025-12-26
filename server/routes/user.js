const express = require('express');
const router = express.Router();
const { authenticateToken, validateWaitlistOwnership } = require('../middleware/clerk');
const Waitlist = require('../models/Waitlist');
const Signup = require('../models/Signup');
const Webhook = require('../models/Webhook');
const WebhookService = require('../services/webhook');
const EmailService = require('../services/email');

// All user routes require JWT authentication
router.use(authenticateToken);

// ========================
// WAITLIST MANAGEMENT
// ========================

/**
 * GET /api/user/waitlists
 * Get all waitlists for the authenticated user
 */
router.get('/waitlists', (req, res) => {
    try {
        const waitlists = Waitlist.findByUserId(req.user.id);

        // Add stats to each waitlist
        const waitlistsWithStats = waitlists.map(wl => ({
            ...wl,
            stats: Waitlist.getStats(wl.id)
        }));

        res.json({
            success: true,
            data: waitlistsWithStats
        });
    } catch (error) {
        console.error('[User] Get waitlists error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/user/waitlists
 * Create a new waitlist for the authenticated user
 */
router.post('/waitlists', (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                error: 'Name required',
                message: 'Please provide a waitlist name'
            });
        }

        const waitlist = Waitlist.create({
            name,
            description,
            userId: req.user.id
        });

        console.log(`[User] Created waitlist: ${name} for user ${req.user.email}`);

        res.status(201).json({
            success: true,
            data: waitlist
        });
    } catch (error) {
        console.error('[User] Create waitlist error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/user/waitlists/:id
 * Get a specific waitlist
 */
router.get('/waitlists/:id', validateWaitlistOwnership, (req, res) => {
    try {
        const stats = Waitlist.getStats(req.waitlist.id);

        res.json({
            success: true,
            data: {
                ...req.waitlist,
                stats
            }
        });
    } catch (error) {
        console.error('[User] Get waitlist error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/user/waitlists/:id
 * Update a waitlist
 */
router.patch('/waitlists/:id', validateWaitlistOwnership, (req, res) => {
    try {
        const updates = req.body;
        const waitlist = Waitlist.update(req.waitlist.id, updates);

        res.json({
            success: true,
            data: waitlist
        });
    } catch (error) {
        console.error('[User] Update waitlist error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/user/waitlists/:id
 * Delete a waitlist
 */
router.delete('/waitlists/:id', validateWaitlistOwnership, (req, res) => {
    try {
        Waitlist.delete(req.waitlist.id);

        res.json({
            success: true,
            message: 'Waitlist deleted'
        });
    } catch (error) {
        console.error('[User] Delete waitlist error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/user/waitlists/:id/regenerate-key
 * Regenerate API key for a waitlist
 */
router.post('/waitlists/:id/regenerate-key', validateWaitlistOwnership, (req, res) => {
    try {
        const waitlist = Waitlist.regenerateApiKey(req.waitlist.id);

        res.json({
            success: true,
            data: {
                api_key: waitlist.api_key
            }
        });
    } catch (error) {
        console.error('[User] Regenerate key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// SIGNUP MANAGEMENT
// ========================

/**
 * GET /api/user/waitlists/:id/signups
 * List all signups for a waitlist
 */
router.get('/waitlists/:id/signups', validateWaitlistOwnership, (req, res) => {
    try {
        const { limit = 50, offset = 0, status, sortBy = 'position', order = 'ASC' } = req.query;

        const signups = Signup.findByWaitlist(req.waitlist.id, {
            limit: Math.min(parseInt(limit), 500),
            offset: parseInt(offset),
            status,
            sortBy,
            order
        });

        const total = Signup.count(req.waitlist.id, status);

        res.json({
            success: true,
            data: signups,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + signups.length < total
            }
        });
    } catch (error) {
        console.error('[User] List signups error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/user/waitlists/:id/signups/:signupId/offboard
 * Mark user as admitted
 */
router.patch('/waitlists/:id/signups/:signupId/offboard', validateWaitlistOwnership, async (req, res) => {
    try {
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        if (signup.status === 'admitted') {
            return res.status(400).json({ error: 'Already admitted' });
        }

        const updated = Signup.offboard(signup.id);

        // Send email and webhook
        EmailService.sendOffboardingEmail(updated, req.waitlist).catch(console.error);
        WebhookService.dispatch(req.waitlist.id, 'offboarded', {
            signup_id: updated.id,
            email: updated.email
        }).catch(console.error);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[User] Offboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/user/waitlists/:id/signups/:signupId
 * Delete a signup
 */
router.delete('/waitlists/:id/signups/:signupId', validateWaitlistOwnership, (req, res) => {
    try {
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        Signup.delete(signup.id);

        res.json({
            success: true,
            message: 'Signup deleted'
        });
    } catch (error) {
        console.error('[User] Delete signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// WEBHOOK MANAGEMENT
// ========================

/**
 * GET /api/user/waitlists/:id/webhooks
 * List webhooks for a waitlist
 */
router.get('/waitlists/:id/webhooks', validateWaitlistOwnership, (req, res) => {
    try {
        const webhooks = Webhook.findByWaitlist(req.waitlist.id);

        res.json({
            success: true,
            data: webhooks
        });
    } catch (error) {
        console.error('[User] List webhooks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/user/waitlists/:id/webhooks
 * Create a webhook
 */
router.post('/waitlists/:id/webhooks', validateWaitlistOwnership, (req, res) => {
    try {
        const { url, events } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }

        const webhook = Webhook.create({
            waitlistId: req.waitlist.id,
            url,
            events: events || ['new_signup', 'offboarded']
        });

        res.status(201).json({
            success: true,
            data: webhook
        });
    } catch (error) {
        console.error('[User] Create webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/user/waitlists/:id/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/waitlists/:id/webhooks/:webhookId', validateWaitlistOwnership, (req, res) => {
    try {
        const webhook = Webhook.findById(req.params.webhookId);

        if (!webhook || webhook.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        Webhook.delete(webhook.id);

        res.json({
            success: true,
            message: 'Webhook deleted'
        });
    } catch (error) {
        console.error('[User] Delete webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
