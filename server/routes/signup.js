const express = require('express');
const router = express.Router();
const { authenticateToken: verifyToken, optionalAuth } = require('../middleware/clerk');
const Signup = require('../models/Signup');
const Waitlist = require('../models/Waitlist');
const emailService = require('../services/email');
const zapierService = require('../services/zapier');

/**
 * POST /signup
 * Public endpoint - Add someone to a waitlist
 * Supports both API key (x-api-key header) and direct waitlist_id in body
 */
router.post('/', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const { email, waitlist_id, referral_code, referral_link, metadata = {} } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        let waitlist;

        // Support both API key and direct waitlist_id
        if (apiKey) {
            waitlist = await Waitlist.findByApiKey(apiKey);
            if (!waitlist) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
        } else if (waitlist_id) {
            waitlist = await Waitlist.findById(waitlist_id);
            if (!waitlist) {
                return res.status(404).json({ error: 'Waitlist not found' });
            }
        } else {
            return res.status(400).json({ error: 'API key or waitlist_id required' });
        }

        if (!waitlist.is_active) {
            return res.status(403).json({ error: 'Waitlist is not active' });
        }

        // Get waitlist settings with defaults
        const settings = { ...Waitlist.getDefaultSettings(), ...(waitlist.settings || {}) };

        // Check if waitlist is closed
        if (settings.closed) {
            return res.status(403).json({
                error: 'Waitlist closed',
                message: 'This waitlist is currently not accepting new signups'
            });
        }

        // Validate domain restrictions
        const emailDomain = email.toLowerCase().split('@')[1];

        // Check permitted domains (if any specified)
        if (settings.permittedDomains && settings.permittedDomains.length > 0) {
            const isPermitted = settings.permittedDomains.some(domain =>
                emailDomain === domain.toLowerCase() || emailDomain.endsWith('.' + domain.toLowerCase())
            );
            if (!isPermitted) {
                return res.status(403).json({
                    error: 'Domain not permitted',
                    message: `Only emails from ${settings.permittedDomains.join(', ')} are allowed`
                });
            }
        }

        // Check if blocking free email providers
        if (settings.blockFreeEmails) {
            const freeEmailDomains = Waitlist.getFreeEmailDomains();
            if (freeEmailDomains.includes(emailDomain)) {
                return res.status(403).json({
                    error: 'Personal email not allowed',
                    message: 'Please use a business or organizational email address'
                });
            }
        }

        // Check if already signed up
        const existing = await Signup.findByEmail(waitlist.id, email);
        if (existing) {
            return res.status(409).json({
                error: 'Already registered',
                message: 'This email is already on the waitlist',
                data: {
                    referral_code: existing.referral_code,
                    position: existing.position,
                    referral_count: existing.referral_count || 0
                }
            });
        }

        // Create signup (support both referral_code and referral_link)
        // Priority boost = spotsSkippedOnReferral * 10 (to allow for fractional ordering)
        const priorityBoost = (settings.spotsSkippedOnReferral || 3) * 10;

        const signup = await Signup.create({
            waitlistId: waitlist.id,
            email,
            referredBy: referral_code || referral_link || null,
            metadata,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            priorityBoost
        });

        // Send welcome email (fire and forget to not block response)
        if (settings.sendWelcomeEmail) {
            emailService.sendWelcomeEmail(signup, waitlist).catch(err =>
                console.error('[Signup] Failed to send welcome email:', err.message)
            );
        }

        // Trigger Zapier new_signup event
        if (settings.connectors?.zapier?.enabled) {
            zapierService.sendNewSignupEvent(signup, waitlist).catch(err =>
                console.error('[Signup] Zapier new_signup event failed:', err.message)
            );
        }

        // Send referral notification email if enabled and there's a referrer
        if (signup.referred_by && settings.emailOnReferral) {
            // Find the referrer to get their email and updated count
            Signup.findByReferralCode(signup.referred_by).then(referrer => {
                if (referrer) {
                    emailService.sendReferralNotification(referrer, referrer.referral_count, waitlist).catch(err =>
                        console.error('[Signup] Failed to send referral notification:', err.message)
                    );

                    // Trigger Zapier new_referrer event
                    if (settings.connectors?.zapier?.enabled) {
                        zapierService.sendReferrerEvent(referrer, waitlist).catch(err =>
                            console.error('[Signup] Zapier new_referrer event failed:', err.message)
                        );
                    }
                }
            }).catch(err => {
                console.error('[Signup] Error finding referrer:', err.message);
            });
        }

        res.status(201).json({
            success: true,
            data: {
                id: signup.id,
                email: signup.email,
                referral_code: signup.referral_code,
                position: signup.position,
                referral_count: 0
            }
        });
    } catch (error) {
        console.error('[Signup] Create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * GET /api/signup/position
 * Public endpoint - Get position in waitlist
 */
router.get('/position', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const { email } = req.query;

        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const waitlist = await Waitlist.findByApiKey(apiKey);
        if (!waitlist) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const result = await Signup.getPosition(waitlist.id, email);
        if (!result) {
            return res.status(404).json({ error: 'Not found on waitlist' });
        }

        res.json({
            success: true,
            data: {
                position: result.current_position,
                referral_code: result.referral_code,
                referral_count: result.referral_count,
                status: result.status
            }
        });
    } catch (error) {
        console.error('[Signup] Position error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============== Authenticated routes (dashboard) ==============

/**
 * GET /api/signups/:waitlistId
 * Get all signups for a waitlist (requires auth)
 */
router.get('/:waitlistId', verifyToken, async (req, res) => {
    try {
        const waitlist = await Waitlist.findById(req.params.waitlistId);

        if (!waitlist) {
            return res.status(404).json({ error: 'Waitlist not found' });
        }

        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { limit = 100, offset = 0, status, sortBy, order } = req.query;

        const signups = await Signup.findByWaitlist(req.params.waitlistId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            status,
            sortBy,
            order
        });

        const total = await Signup.count(req.params.waitlistId, status);

        res.json({
            success: true,
            data: {
                signups,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[Signups] Get all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/signups/:id/verify
 * Verify a signup
 */
router.put('/:id/verify', verifyToken, async (req, res) => {
    try {
        const signup = await Signup.findById(req.params.id);
        if (!signup) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        const waitlist = await Waitlist.findById(signup.waitlist_id);
        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await Signup.verify(req.params.id);

        res.json({
            success: true,
            data: { signup: updated }
        });
    } catch (error) {
        console.error('[Signups] Verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/signups/:id/offboard
 * Admit/offboard a signup
 */
router.put('/:id/offboard', verifyToken, async (req, res) => {
    try {
        const signup = await Signup.findById(req.params.id);
        if (!signup) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        const waitlist = await Waitlist.findById(signup.waitlist_id);
        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await Signup.offboard(req.params.id);

        // Trigger Zapier offboard event
        const settings = waitlist.settings || {};
        if (settings.connectors?.zapier?.enabled) {
            zapierService.sendOffboardEvent(updated, waitlist).catch(err =>
                console.error('[Signups] Zapier offboard event failed:', err.message)
            );
        }

        res.json({
            success: true,
            data: { signup: updated }
        });
    } catch (error) {
        console.error('[Signups] Offboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/signups/:id
 * Delete a signup
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const signup = await Signup.findById(req.params.id);
        if (!signup) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        const waitlist = await Waitlist.findById(signup.waitlist_id);
        if (waitlist.user_id !== req.auth.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Signup.delete(req.params.id);

        res.json({
            success: true,
            message: 'Signup deleted'
        });
    } catch (error) {
        console.error('[Signups] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
