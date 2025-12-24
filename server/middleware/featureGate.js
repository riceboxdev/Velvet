const Subscription = require('../models/Subscription');

/**
 * Feature Gate Middleware Factory
 * Creates middleware that checks if the authenticated user has access to a specific feature
 * 
 * Usage:
 *   router.use(requireFeature('zapier_integration'));
 *   router.put('/settings', requireFeature('remove_branding'), handler);
 */
function requireFeature(featureName) {
    return async (req, res, next) => {
        try {
            // Must be used after authenticateToken middleware
            if (!req.user && !req.auth) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this feature'
                });
            }

            const userId = req.user?.id || req.auth?.uid;
            const limits = await Subscription.getUserLimits(userId);

            if (!limits.features.includes(featureName)) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    feature: featureName,
                    upgrade_required: true,
                    current_plan: limits.plan_name,
                    message: `This feature requires a higher plan. Please upgrade to access ${formatFeatureName(featureName)}.`
                });
            }

            // Attach limits to request for downstream use
            req.userLimits = limits;
            next();
        } catch (error) {
            console.error('[FeatureGate] Error checking feature access:', error);
            res.status(500).json({ error: 'Failed to verify feature access' });
        }
    };
}

/**
 * Check if user has ANY of the specified features
 */
function requireAnyFeature(featureNames) {
    return async (req, res, next) => {
        try {
            if (!req.user && !req.auth) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'You must be logged in to access this feature'
                });
            }

            const userId = req.user?.id || req.auth?.uid;
            const limits = await Subscription.getUserLimits(userId);

            const hasAccess = featureNames.some(f => limits.features.includes(f));

            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Feature restricted',
                    features: featureNames,
                    upgrade_required: true,
                    current_plan: limits.plan_name,
                    message: `This feature requires a higher plan.`
                });
            }

            req.userLimits = limits;
            next();
        } catch (error) {
            console.error('[FeatureGate] Error checking feature access:', error);
            res.status(500).json({ error: 'Failed to verify feature access' });
        }
    };
}

/**
 * Check resource limits (waitlists, signups, team members)
 */
function checkLimit(limitType) {
    return async (req, res, next) => {
        try {
            if (!req.user && !req.auth) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            const userId = req.user?.id || req.auth?.uid;
            const limits = await Subscription.getUserLimits(userId);

            // null means unlimited
            if (limits[limitType] === null) {
                req.userLimits = limits;
                return next();
            }

            // Get current usage based on limit type
            let currentUsage = 0;

            if (limitType === 'max_waitlists') {
                const Waitlist = require('../models/Waitlist');
                const waitlists = await Waitlist.findByUserId(userId);
                currentUsage = waitlists.length;
            } else if (limitType === 'max_team_members') {
                // TODO: Implement team member counting
                currentUsage = 1;
            }
            // max_signups_per_month is handled per-waitlist basis

            if (currentUsage >= limits[limitType]) {
                return res.status(403).json({
                    error: 'Limit reached',
                    limit_type: limitType,
                    current_usage: currentUsage,
                    limit: limits[limitType],
                    upgrade_required: true,
                    current_plan: limits.plan_name,
                    message: `You've reached your ${formatLimitName(limitType)} limit. Please upgrade to create more.`
                });
            }

            req.userLimits = limits;
            next();
        } catch (error) {
            console.error('[FeatureGate] Error checking limit:', error);
            res.status(500).json({ error: 'Failed to verify limits' });
        }
    };
}

/**
 * Attach user limits to request without blocking
 * Useful for conditional feature display
 */
async function attachLimits(req, res, next) {
    try {
        if (req.user || req.auth) {
            const userId = req.user?.id || req.auth?.uid;
            req.userLimits = await Subscription.getUserLimits(userId);
        }
        next();
    } catch (error) {
        console.error('[FeatureGate] Error attaching limits:', error);
        next(); // Don't block, just continue without limits
    }
}

// Helper to format feature names for user-friendly messages
function formatFeatureName(feature) {
    const labels = {
        'remove_branding': 'Remove Branding',
        'zapier_integration': 'Zapier Integration',
        'hide_position_count': 'Hide Position Count',
        'block_personal_emails': 'Block Personal Emails',
        'allowed_domains': 'Domain Whitelist',
        'custom_email_templates': 'Custom Email Templates',
        'custom_offboarding_email': 'Custom Offboarding Emails',
        'email_blasts': 'Email Blasts',
        'custom_domain_emails': 'Custom Email Domain',
        'analytics_deep': 'Advanced Analytics',
        'multi_user_team': 'Team Management',
        'move_user_position': 'Move User Position API'
    };
    return labels[feature] || feature.replace(/_/g, ' ');
}

function formatLimitName(limit) {
    const labels = {
        'max_waitlists': 'waitlist',
        'max_signups_per_month': 'monthly signup',
        'max_team_members': 'team member'
    };
    return labels[limit] || limit;
}

module.exports = {
    requireFeature,
    requireAnyFeature,
    checkLimit,
    attachLimits
};
