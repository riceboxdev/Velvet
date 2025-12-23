const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Signup = require('../models/Signup');
const Webhook = require('../models/Webhook');
const WebhookService = require('../services/webhook');
const EmailService = require('../services/email');
const { authenticateApiKey } = require('../middleware/auth');

// All admin routes require API key authentication
router.use(authenticateApiKey);

// ========================
// WAITLIST MANAGEMENT
// ========================

/**
 * GET /api/admin/waitlist
 * Get authenticated waitlist details
 */
router.get('/waitlist', (req, res) => {
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
        console.error('[Admin] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/admin/waitlist
 * Update waitlist settings
 */
router.patch('/waitlist', (req, res) => {
    try {
        const updates = req.body;
        const waitlist = Waitlist.update(req.waitlist.id, updates);

        res.json({
            success: true,
            data: waitlist
        });
    } catch (error) {
        console.error('[Admin] Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/admin/waitlist/regenerate-key
 * Regenerate API key
 */
router.post('/waitlist/regenerate-key', (req, res) => {
    try {
        const waitlist = Waitlist.regenerateApiKey(req.waitlist.id);

        res.json({
            success: true,
            data: {
                api_key: waitlist.api_key
            }
        });
    } catch (error) {
        console.error('[Admin] Regenerate key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// SIGNUP MANAGEMENT
// ========================

/**
 * GET /api/admin/signups
 * List all signups with pagination
 */
router.get('/signups', (req, res) => {
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
        console.error('[Admin] List signups error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/admin/signups/:signupId
 * Get a specific signup
 */
router.get('/signups/:signupId', (req, res) => {
    try {
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Signup not found'
            });
        }

        const positionInfo = Signup.getPosition(signup.waitlist_id, signup.email);

        res.json({
            success: true,
            data: {
                ...signup,
                current_position: positionInfo.current_position
            }
        });
    } catch (error) {
        console.error('[Admin] Get signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/admin/signups/:signupId/offboard
 * Mark user as admitted (offboard)
 */
router.patch('/signups/:signupId/offboard', async (req, res) => {
    try {
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Signup not found'
            });
        }

        if (signup.status === 'admitted') {
            return res.status(400).json({
                error: 'Already admitted',
                message: 'This user has already been admitted'
            });
        }

        const updated = Signup.offboard(signup.id);

        // Send offboarding email
        EmailService.sendOffboardingEmail(updated, req.waitlist)
            .catch(err => console.error('[Email] Offboard error:', err));

        // Dispatch webhook
        WebhookService.dispatch(req.waitlist.id, 'offboarded', {
            signup_id: updated.id,
            email: updated.email
        }).catch(err => console.error('[Webhook] Offboard dispatch error:', err));

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[Admin] Offboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/admin/signups/:signupId/advance
 * Manually boost a user's priority
 */
router.patch('/signups/:signupId/advance', (req, res) => {
    try {
        const { amount = 100 } = req.body;
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Signup not found'
            });
        }

        const updated = Signup.advancePriority(signup.id, parseInt(amount));
        const positionInfo = Signup.getPosition(updated.waitlist_id, updated.email);

        res.json({
            success: true,
            data: {
                ...updated,
                current_position: positionInfo.current_position
            }
        });
    } catch (error) {
        console.error('[Admin] Advance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/admin/signups/:signupId
 * Remove a signup
 */
router.delete('/signups/:signupId', (req, res) => {
    try {
        const signup = Signup.findById(req.params.signupId);

        if (!signup || signup.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Signup not found'
            });
        }

        Signup.delete(signup.id);

        res.json({
            success: true,
            message: 'Signup deleted successfully'
        });
    } catch (error) {
        console.error('[Admin] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// WEBHOOK MANAGEMENT
// ========================

/**
 * GET /api/admin/webhooks
 * List webhooks for the waitlist
 */
router.get('/webhooks', (req, res) => {
    try {
        const webhooks = Webhook.findByWaitlist(req.waitlist.id);

        res.json({
            success: true,
            data: webhooks
        });
    } catch (error) {
        console.error('[Admin] List webhooks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/admin/webhooks
 * Create a new webhook
 */
router.post('/webhooks', (req, res) => {
    try {
        const { url, events } = req.body;

        if (!url) {
            return res.status(400).json({
                error: 'URL required',
                message: 'Please provide a webhook URL'
            });
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
        console.error('[Admin] Create webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/admin/webhooks/:webhookId
 * Update a webhook
 */
router.patch('/webhooks/:webhookId', (req, res) => {
    try {
        const webhook = Webhook.findById(req.params.webhookId);

        if (!webhook || webhook.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Webhook not found'
            });
        }

        const updated = Webhook.update(webhook.id, req.body);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[Admin] Update webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/admin/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/webhooks/:webhookId', (req, res) => {
    try {
        const webhook = Webhook.findById(req.params.webhookId);

        if (!webhook || webhook.waitlist_id !== req.waitlist.id) {
            return res.status(404).json({
                error: 'Webhook not found'
            });
        }

        Webhook.delete(webhook.id);

        res.json({
            success: true,
            message: 'Webhook deleted successfully'
        });
    } catch (error) {
        console.error('[Admin] Delete webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
