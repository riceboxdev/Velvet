const express = require('express');
const router = express.Router();
const { authenticateToken: verifyToken } = require('../middleware/clerk');
const Waitlist = require('../models/Waitlist');
const emailService = require('../services/email');
const { clerkClient } = require('@clerk/express');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/waitlists
 * Get all waitlists for the current user
 */
router.get('/', async (req, res) => {
    try {
        const waitlists = await Waitlist.findByUserId(req.auth.userId);

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
            userId: req.auth.userId
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

        if (waitlist.user_id !== req.auth.userId) {
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
const Subscription = require('../models/Subscription');

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

        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, description, settings, is_active } = req.body;

        // Feature Gating Logic
        if (settings) {
            const limits = await Subscription.getUserLimits(req.auth.userId);
            const features = limits.features || [];

            // Remove Branding
            if (settings.widget?.showBranding === false && !features.includes('remove_branding')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required to remove branding',
                    feature: 'remove_branding'
                });
            }

            // Zapier
            if (settings.connectors?.zapier?.enabled && !features.includes('zapier_integration')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required for Zapier integration',
                    feature: 'zapier_integration'
                });
            }

            // Hide Counts
            if ((settings.hidePosition || settings.hideSignupCount) && !features.includes('hide_position_count')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required to hide signup counts',
                    feature: 'hide_position_count'
                });
            }

            // Block Free Emails
            if (settings.blockFreeEmails && !features.includes('block_personal_emails')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required to block personal emails',
                    feature: 'block_personal_emails'
                });
            }

            // Permitted Domains
            if (settings.permittedDomains?.length > 0 && !features.includes('allowed_domains')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required to whitelist domains',
                    feature: 'allowed_domains'
                });
            }

            // Custom Offboarding Email
            if (settings.sendOffboardingEmail === true && !features.includes('custom_offboarding_email')) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    details: 'Upgrade required for offboarding emails',
                    feature: 'custom_offboarding_email'
                });
            }
        }

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

        if (waitlist.user_id !== req.auth.userId) {
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

        if (waitlist.user_id !== req.auth.userId) {
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

/**
 * POST /api/waitlists/:id/regenerate-zapier-key
 * Regenerate Zapier API key
 */
router.post('/:id/regenerate-zapier-key', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await Waitlist.regenerateZapierKey(req.params.id);

        res.json({
            success: true,
            data: { zapier_api_key: updated.zapier_api_key }
        });
    } catch (error) {
        console.error('[Waitlists] Regenerate Zapier key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/waitlists/:id/test-email
 * Send a test welcome email to the current user
 */
router.post('/:id/test-email', async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.id);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get user's email from Clerk
        const clerkUser = await clerkClient.users.getUser(req.auth.userId);
        const email = clerkUser.primaryEmailAddress?.emailAddress || 'test@riceboxai.com';

        if (!email) {
            return res.status(400).json({ error: 'User has no email address' });
        }

        const mockSignup = {
            email: email,
            position: 1,
            referral_code: 'TEST-CODE',
            id: 'test-signup-id'
        };

        // Attempt to send email
        // We catch errors inside to return them as JSON
        try {
            await emailService.sendWelcomeEmail(mockSignup, waitlist);
            res.json({ success: true, message: `Test email sent to ${email}` });
        } catch (emailError) {
            console.error('[Waitlists] Test email failed:', emailError);
            res.status(500).json({
                error: 'Failed to send email',
                details: emailError.message,
                // SendGrid specific error details if available
                providerError: emailError.response?.body
            });
        }

    } catch (error) {
        console.error('[Waitlists] Test email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
