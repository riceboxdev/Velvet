const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/subscription/plans
 * Get all available subscription plans (public)
 */
router.get('/plans', async (req, res) => {
    try {
        const plans = await Subscription.getAllPlans();

        // Format for frontend display
        const formattedPlans = plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthly_price,
            annualPrice: plan.annual_price,
            annualMonthlyPrice: plan.annual_price ? Math.round(plan.annual_price / 12) : 0,
            maxWaitlists: plan.max_waitlists,
            maxSignupsPerMonth: plan.max_signups_per_month,
            maxTeamMembers: plan.max_team_members,
            features: plan.features || [],
            isPopular: plan.name === 'Advanced', // Mark Advanced as popular
            isEnterprise: plan.is_enterprise || plan.name === 'Enterprise',
            isFree: plan.name === 'Free'
        }));

        res.json(formattedPlans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
});

/**
 * GET /api/subscription/current
 * Get current user's subscription
 */
router.get('/current', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.findActiveByUserId(req.user.id);
        const limits = await Subscription.getUserLimits(req.user.id);

        res.json({
            subscription: subscription ? {
                id: subscription.id,
                planId: subscription.plan_id,
                billingCycle: subscription.billing_cycle,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                stripeSubscriptionId: subscription.stripe_subscription_id
            } : null,
            limits: {
                maxWaitlists: limits.max_waitlists,
                maxSignupsPerMonth: limits.max_signups_per_month,
                maxTeamMembers: limits.max_team_members,
                features: limits.features,
                planName: limits.plan_name,
                hasSubscription: limits.has_subscription
            }
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

/**
 * POST /api/subscription/subscribe
 * Subscribe to a plan (for non-Stripe flow or testing)
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
    try {
        const { planId, billingCycle = 'monthly' } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        // Check if plan exists
        const plan = await Subscription.findPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Check for enterprise plan
        if (plan.is_enterprise || plan.name === 'Enterprise') {
            return res.status(400).json({
                error: 'Enterprise plans require contacting sales',
                contactSales: true
            });
        }

        // Check if user already has active subscription
        const existingSub = await Subscription.findActiveByUserId(req.user.id);
        if (existingSub) {
            return res.status(400).json({
                error: 'You already have an active subscription. Please upgrade or cancel first.',
                hasExisting: true
            });
        }

        // Create subscription
        const subscription = await Subscription.createSubscription({
            userId: req.user.id,
            planId,
            billingCycle
        });

        res.status(201).json({
            message: 'Successfully subscribed',
            subscription: {
                id: subscription.id,
                planId: subscription.plan_id,
                billingCycle: subscription.billing_cycle,
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end
            }
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

/**
 * PUT /api/subscription/change
 * Change subscription plan
 */
router.put('/change', authenticateToken, async (req, res) => {
    try {
        const { planId, billingCycle } = req.body;

        const existingSub = await Subscription.findActiveByUserId(req.user.id);
        if (!existingSub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Get the new plan
        const plan = await Subscription.findPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.is_enterprise || plan.name === 'Enterprise') {
            return res.status(400).json({
                error: 'Enterprise plans require contacting sales',
                contactSales: true
            });
        }

        const updates = {};
        if (planId) updates.plan_id = planId;
        if (billingCycle) updates.billing_cycle = billingCycle;

        const updated = await Subscription.update(existingSub.id, updates);

        res.json({
            message: 'Subscription updated',
            subscription: {
                id: updated.id,
                planId: updated.plan_id,
                billingCycle: updated.billing_cycle
            }
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const existingSub = await Subscription.findActiveByUserId(req.user.id);
        if (!existingSub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        await Subscription.cancel(existingSub.id);

        res.json({
            message: 'Subscription cancelled',
            effectiveUntil: existingSub.current_period_end
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

/**
 * GET /api/subscription/features
 * Get user's current features (for frontend feature flags)
 */
router.get('/features', authenticateToken, async (req, res) => {
    try {
        const limits = await Subscription.getUserLimits(req.user.id);

        // Build feature flags object
        const featureFlags = {};
        const allFeatures = [
            'custom_branding', 'api_access', 'webhooks', 'slack_integration',
            'email_verification', 'analytics_basic', 'csv_export', 'leaderboard',
            'remove_branding', 'zapier_integration', 'hide_position_count',
            'block_personal_emails', 'allowed_domains', 'move_user_position',
            'analytics_deep', 'custom_email_templates', 'custom_offboarding_email',
            'custom_domain_emails', 'email_blasts', 'multi_user_team',
            'sso', 'custom_sla', 'dedicated_support', 'custom_features'
        ];

        for (const feature of allFeatures) {
            featureFlags[feature] = limits.features.includes(feature);
        }

        res.json({
            planName: limits.plan_name,
            features: featureFlags,
            limits: {
                maxWaitlists: limits.max_waitlists,
                maxSignupsPerMonth: limits.max_signups_per_month,
                maxTeamMembers: limits.max_team_members
            }
        });
    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ error: 'Failed to fetch features' });
    }
});

// ==================== TEST MODE ENDPOINTS ====================
// These endpoints bypass Stripe for testing plan changes
// WARNING: Only use in development/staging environments

/**
 * POST /api/subscription/test/set-plan
 * Directly set a user's plan for testing (no payment required)
 */
router.post('/test/set-plan', authenticateToken, async (req, res) => {
    try {
        const { planName, billingCycle = 'monthly' } = req.body;

        if (!planName) {
            return res.status(400).json({ error: 'planName is required' });
        }

        // Find plan by name
        const plans = await Subscription.getAllPlans();
        const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());

        if (!plan) {
            return res.status(404).json({
                error: 'Plan not found',
                availablePlans: plans.map(p => p.name)
            });
        }

        // Check for existing subscription
        const existingSub = await Subscription.findActiveByUserId(req.user.id);

        if (existingSub) {
            // Update existing subscription
            const updated = await Subscription.update(existingSub.id, {
                plan_id: plan.id,
                billing_cycle: billingCycle,
                status: 'active'
            });

            // Get updated limits
            const limits = await Subscription.getUserLimits(req.user.id);

            return res.json({
                success: true,
                message: `Plan updated to ${plan.name}`,
                mode: 'test',
                subscription: {
                    id: updated.id,
                    planId: plan.id,
                    planName: plan.name,
                    billingCycle,
                    status: 'active'
                },
                limits: {
                    maxWaitlists: limits.max_waitlists,
                    maxSignupsPerMonth: limits.max_signups_per_month,
                    features: limits.features
                }
            });
        } else {
            // Create new subscription
            const subscription = await Subscription.createSubscription({
                userId: req.user.id,
                planId: plan.id,
                billingCycle
            });

            const limits = await Subscription.getUserLimits(req.user.id);

            return res.status(201).json({
                success: true,
                message: `Subscribed to ${plan.name}`,
                mode: 'test',
                subscription: {
                    id: subscription.id,
                    planId: plan.id,
                    planName: plan.name,
                    billingCycle,
                    status: 'active'
                },
                limits: {
                    maxWaitlists: limits.max_waitlists,
                    maxSignupsPerMonth: limits.max_signups_per_month,
                    features: limits.features
                }
            });
        }
    } catch (error) {
        console.error('[Test] Set plan error:', error);
        res.status(500).json({ error: 'Failed to set test plan' });
    }
});

/**
 * POST /api/subscription/test/clear
 * Remove user's subscription (revert to Free)
 */
router.post('/test/clear', authenticateToken, async (req, res) => {
    try {
        const existingSub = await Subscription.findActiveByUserId(req.user.id);

        if (!existingSub) {
            return res.json({
                success: true,
                message: 'No subscription to clear (already on Free plan)'
            });
        }

        await Subscription.cancel(existingSub.id);

        res.json({
            success: true,
            message: 'Subscription cleared - now on Free plan'
        });
    } catch (error) {
        console.error('[Test] Clear subscription error:', error);
        res.status(500).json({ error: 'Failed to clear subscription' });
    }
});

/**
 * GET /api/subscription/test/plans
 * Get all plans for test mode dropdown
 */
router.get('/test/plans', async (req, res) => {
    try {
        const plans = await Subscription.getAllPlans();

        res.json({
            success: true,
            plans: plans.map(p => ({
                id: p.id,
                name: p.name,
                features: p.features || [],
                maxWaitlists: p.max_waitlists,
                maxSignupsPerMonth: p.max_signups_per_month,
                maxTeamMembers: p.max_team_members
            }))
        });
    } catch (error) {
        console.error('[Test] Get plans error:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

/**
 * POST /api/subscription/test/seed-plans
 * Seed initial plans into database (one-time setup)
 * No auth required - safe because it only creates plans if they don't exist
 */
router.post('/test/seed-plans', async (req, res) => {
    try {
        const plans = [
            {
                name: 'Free',
                description: 'Get started with 1 waitlist',
                monthlyPrice: 0,
                annualPrice: 0,
                maxWaitlists: 1,
                maxSignupsPerMonth: 100,
                maxTeamMembers: 1,
                features: ['custom_branding', 'email_verification', 'csv_export'],
                sortOrder: 0
            },
            {
                name: 'Basic',
                description: 'For individuals and small projects',
                monthlyPrice: 15,
                annualPrice: 120,
                maxWaitlists: null,
                maxSignupsPerMonth: null,
                maxTeamMembers: 1,
                features: [
                    'custom_branding', 'api_access', 'webhooks', 'slack_integration',
                    'email_verification', 'analytics_basic', 'csv_export', 'leaderboard'
                ],
                sortOrder: 1
            },
            {
                name: 'Advanced',
                description: 'For growing businesses',
                monthlyPrice: 50,
                annualPrice: 396,
                maxWaitlists: null,
                maxSignupsPerMonth: null,
                maxTeamMembers: 5,
                features: [
                    'custom_branding', 'api_access', 'webhooks', 'slack_integration',
                    'email_verification', 'analytics_basic', 'csv_export', 'leaderboard',
                    'remove_branding', 'zapier_integration', 'hide_position_count',
                    'block_personal_emails', 'allowed_domains', 'move_user_position'
                ],
                sortOrder: 2
            },
            {
                name: 'Pro',
                description: 'For power users and teams',
                monthlyPrice: 250,
                annualPrice: 2004,
                maxWaitlists: null,
                maxSignupsPerMonth: null,
                maxTeamMembers: null,
                features: [
                    'custom_branding', 'api_access', 'webhooks', 'slack_integration',
                    'email_verification', 'csv_export', 'leaderboard',
                    'remove_branding', 'zapier_integration', 'hide_position_count',
                    'block_personal_emails', 'allowed_domains', 'move_user_position',
                    'analytics_deep', 'custom_email_templates', 'custom_offboarding_email',
                    'custom_domain_emails', 'email_blasts', 'multi_user_team'
                ],
                sortOrder: 3
            },
            {
                name: 'Enterprise',
                description: 'Custom solutions for large organizations',
                monthlyPrice: 0,
                annualPrice: 0,
                maxWaitlists: null,
                maxSignupsPerMonth: null,
                maxTeamMembers: null,
                features: [
                    'custom_branding', 'api_access', 'webhooks', 'slack_integration',
                    'email_verification', 'csv_export', 'leaderboard',
                    'remove_branding', 'zapier_integration', 'hide_position_count',
                    'block_personal_emails', 'allowed_domains', 'move_user_position',
                    'analytics_deep', 'custom_email_templates', 'custom_offboarding_email',
                    'custom_domain_emails', 'email_blasts', 'multi_user_team',
                    'sso', 'custom_sla', 'dedicated_support', 'custom_features'
                ],
                sortOrder: 4,
                isEnterprise: true
            }
        ];

        const results = [];
        const existingPlans = await Subscription.getAllPlans();

        for (const plan of plans) {
            const existing = existingPlans.find(p => p.name === plan.name);

            if (existing) {
                results.push({ name: plan.name, status: 'exists', id: existing.id });
            } else {
                const created = await Subscription.createPlan(plan);
                results.push({ name: plan.name, status: 'created', id: created.id });
            }
        }

        res.json({
            success: true,
            message: 'Plans seeded',
            results
        });
    } catch (error) {
        console.error('[Test] Seed plans error:', error);
        res.status(500).json({ error: 'Failed to seed plans', details: error.message });
    }
});

module.exports = router;
