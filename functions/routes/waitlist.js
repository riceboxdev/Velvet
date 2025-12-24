const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Signup = require('../models/Signup');

/**
 * GET /waitlist/:waitlistId
 * Get waitlist info and stats (public)
 */
router.get('/:waitlistId', async (req, res) => {
    try {
        const { waitlistId } = req.params;

        const waitlist = await Waitlist.findById(waitlistId);
        if (!waitlist) {
            return res.status(404).json({
                error: 'Waitlist not found'
            });
        }

        const stats = await Signup.count(waitlistId);

        res.json({
            success: true,
            data: {
                id: waitlist.id,
                name: waitlist.name,
                description: waitlist.description,
                total_signups: stats || 0,
                is_active: waitlist.is_active,
                settings: {
                    // Expose public settings needed for hosted page
                    branding: waitlist.settings?.branding || {},
                    showLeaderboard: waitlist.settings?.showLeaderboard !== false,
                    widget: waitlist.settings?.widget || {},
                    social: waitlist.settings?.social || {},
                    questions: waitlist.settings?.questions || {}
                }
            }
        });
    } catch (error) {
        console.error('[Waitlist] Error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * GET /waitlist/:waitlistId/leaderboard
 * Get referral leaderboard (public)
 */
router.get('/:waitlistId/leaderboard', async (req, res) => {
    try {
        const { waitlistId } = req.params;
        const { limit = 10 } = req.query;

        const waitlist = await Waitlist.findById(waitlistId);
        if (!waitlist) {
            return res.status(404).json({
                error: 'Waitlist not found'
            });
        }

        // Check if leaderboard is enabled
        if (waitlist.settings?.showLeaderboard === false) {
            return res.status(403).json({
                error: 'Leaderboard disabled',
                message: 'Leaderboard is not available for this waitlist'
            });
        }

        const leaderboard = await Signup.getLeaderboard(waitlistId, Math.min(parseInt(limit), 100));

        // Mask emails for privacy (show only first 3 chars + domain)
        const maskedLeaderboard = leaderboard.map((entry, index) => {
            const [localPart, domain] = (entry.email || '').split('@');
            const maskedEmail = localPart ? localPart.slice(0, 3) + '***@' + domain : '***@***';

            return {
                rank: index + 1,
                email: maskedEmail,
                referral_count: entry.referral_count || 0,
                priority: entry.priority || 0
            };
        });

        res.json({
            success: true,
            data: maskedLeaderboard
        });
    } catch (error) {
        console.error('[Waitlist] Leaderboard error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * GET /waitlist/:waitlistId/stats
 * Get detailed waitlist statistics
 */
router.get('/:waitlistId/stats', async (req, res) => {
    try {
        const { waitlistId } = req.params;

        const waitlist = await Waitlist.findById(waitlistId);
        if (!waitlist) {
            return res.status(404).json({
                error: 'Waitlist not found'
            });
        }

        const total = await Signup.count(waitlistId);
        const waiting = await Signup.count(waitlistId, 'waiting');
        const verified = await Signup.count(waitlistId, 'verified');
        const admitted = await Signup.count(waitlistId, 'admitted');

        res.json({
            success: true,
            data: {
                total_signups: total || 0,
                waiting: waiting || 0,
                verified: verified || 0,
                admitted: admitted || 0
            }
        });
    } catch (error) {
        console.error('[Waitlist] Stats error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

module.exports = router;
