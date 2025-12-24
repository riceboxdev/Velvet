const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Signup = require('../models/Signup');
const ZapierHook = require('../models/ZapierHook');
const Subscription = require('../models/Subscription');

/**
 * Middleware: Authenticate via Zapier API key
 * Zapier sends the API key in the x-api-key header
 * Also verifies the waitlist owner has Zapier feature access
 */
async function authenticateZapier(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    // Look up waitlist by zapier_api_key or regular api_key
    let waitlist = await Waitlist.findByZapierApiKey(apiKey);

    if (!waitlist) {
        // Fallback to regular API key for backwards compatibility
        waitlist = await Waitlist.findByApiKey(apiKey);
    }

    if (!waitlist) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if Zapier is enabled on waitlist settings
    const settings = waitlist.settings || {};
    if (!settings.connectors?.zapier?.enabled) {
        return res.status(403).json({ error: 'Zapier integration is not enabled for this waitlist' });
    }

    // Check if waitlist owner's plan includes Zapier feature
    if (waitlist.user_id) {
        const limits = await Subscription.getUserLimits(waitlist.user_id);
        if (!limits.features.includes('zapier_integration')) {
            return res.status(403).json({
                error: 'Feature restricted',
                feature: 'zapier_integration',
                upgrade_required: true,
                message: 'Zapier integration requires an Advanced plan or higher.'
            });
        }
    }

    req.waitlist = waitlist;
    next();
}

/**
 * Format signup for Zapier response
 */
function formatSignup(signup, waitlist) {
    const baseUrl = process.env.BASE_URL || 'https://velvet.app';
    const referralLink = `${baseUrl}/join/${waitlist.id}?ref=${signup.referral_code}`;

    return {
        id: signup.id,
        uuid: signup.id,
        email: signup.email,
        first_name: signup.metadata?.first_name || null,
        last_name: signup.metadata?.last_name || null,
        phone: signup.metadata?.phone || null,
        position: signup.position,
        priority: signup.priority,
        referral_code: signup.referral_code,
        referral_token: signup.referral_code,
        referral_link: referralLink,
        referral_count: signup.referral_count || 0,
        amount_referred: signup.referral_count || 0,
        referred_by: signup.referred_by,
        referred_by_signup_token: signup.referred_by,
        status: signup.status,
        verified: signup.status === 'verified' || signup.verified_at !== null,
        created_at: formatTimestamp(signup.created_at),
        verified_at: formatTimestamp(signup.verified_at),
        admitted_at: formatTimestamp(signup.admitted_at),
        removed_date: signup.status === 'admitted' ? formatTimestamp(signup.admitted_at) : null,
        removed_priority: signup.status === 'admitted' ? signup.priority : null,
        metadata: signup.metadata || {},
        answers: signup.metadata?.answers || [],
        waitlist_id: waitlist.id,
        waitlist_name: waitlist.name
    };
}

function formatTimestamp(timestamp) {
    if (!timestamp) return null;
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toISOString();
    }
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    return timestamp;
}

// ============== Polling Endpoints ==============
// These endpoints are used by Zapier during initial setup and testing

/**
 * GET /api/zapier/signups
 * Get recent signups for polling trigger
 */
router.get('/signups', authenticateZapier, async (req, res) => {
    try {
        const signups = await Signup.findByWaitlist(req.waitlist.id, {
            limit: 3,
            sortBy: 'created_at',
            order: 'desc'
        });

        const formatted = signups.map(s => formatSignup(s, req.waitlist));
        res.json(formatted);
    } catch (error) {
        console.error('[Zapier] Get signups error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/zapier/referrers
 * Get recent referrers (signups who have made referrals) for polling trigger
 */
router.get('/referrers', authenticateZapier, async (req, res) => {
    try {
        // Get signups with referral_count > 0, sorted by most recent referral activity
        const signups = await Signup.findByWaitlist(req.waitlist.id, {
            limit: 50,
            sortBy: 'referral_count',
            order: 'desc'
        });

        // Filter to only those with referrals
        const referrers = signups.filter(s => s.referral_count > 0).slice(0, 3);
        const formatted = referrers.map(s => formatSignup(s, req.waitlist));

        res.json(formatted);
    } catch (error) {
        console.error('[Zapier] Get referrers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/zapier/offboarded
 * Get recently offboarded users for polling trigger
 */
router.get('/offboarded', authenticateZapier, async (req, res) => {
    try {
        const signups = await Signup.findByWaitlist(req.waitlist.id, {
            limit: 3,
            status: 'admitted',
            sortBy: 'created_at',
            order: 'desc'
        });

        const formatted = signups.map(s => formatSignup(s, req.waitlist));
        res.json(formatted);
    } catch (error) {
        console.error('[Zapier] Get offboarded error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============== REST Hook Subscription Endpoints ==============

/**
 * POST /api/zapier/subscribe
 * Register a webhook URL for an event type
 */
router.post('/subscribe', authenticateZapier, async (req, res) => {
    try {
        const { hookUrl, event } = req.body;

        if (!hookUrl) {
            return res.status(400).json({ error: 'hookUrl is required' });
        }

        if (!event) {
            return res.status(400).json({ error: 'event is required' });
        }

        const validEvents = ZapierHook.getValidEvents();
        if (!validEvents.includes(event)) {
            return res.status(400).json({
                error: `Invalid event type. Must be one of: ${validEvents.join(', ')}`
            });
        }

        const hook = await ZapierHook.create({
            waitlistId: req.waitlist.id,
            hookUrl,
            event
        });

        console.log(`[Zapier] New hook subscription: ${event} -> ${hookUrl}`);

        res.status(201).json({
            success: true,
            data: {
                id: hook.id,
                event: hook.event,
                hook_url: hook.hook_url
            }
        });
    } catch (error) {
        console.error('[Zapier] Subscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/zapier/subscribe/:id
 * Unsubscribe a webhook
 */
router.delete('/subscribe/:id', authenticateZapier, async (req, res) => {
    try {
        const hook = await ZapierHook.findById(req.params.id);

        if (!hook) {
            return res.status(404).json({ error: 'Hook not found' });
        }

        // Verify the hook belongs to this waitlist
        if (hook.waitlist_id !== req.waitlist.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await ZapierHook.delete(req.params.id);

        console.log(`[Zapier] Hook unsubscribed: ${req.params.id}`);

        res.json({ success: true, message: 'Hook unsubscribed' });
    } catch (error) {
        console.error('[Zapier] Unsubscribe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/zapier/hooks
 * List all registered hooks for this waitlist (for debugging)
 */
router.get('/hooks', authenticateZapier, async (req, res) => {
    try {
        const hooks = await ZapierHook.findByWaitlistId(req.waitlist.id);

        res.json({
            success: true,
            data: hooks.map(h => ({
                id: h.id,
                event: h.event,
                hook_url: h.hook_url,
                is_active: h.is_active,
                created_at: formatTimestamp(h.created_at)
            }))
        });
    } catch (error) {
        console.error('[Zapier] List hooks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/zapier/me
 * Authentication test endpoint - returns waitlist info if key is valid
 */
router.get('/me', authenticateZapier, async (req, res) => {
    res.json({
        success: true,
        data: {
            waitlist_id: req.waitlist.id,
            waitlist_name: req.waitlist.name,
            zapier_enabled: true
        }
    });
});

module.exports = router;
