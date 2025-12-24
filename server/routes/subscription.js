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

module.exports = router;
