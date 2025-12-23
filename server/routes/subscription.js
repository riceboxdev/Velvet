const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/subscription/plans
 * Get all available subscription plans (public)
 */
router.get('/plans', (req, res) => {
    try {
        const plans = Subscription.getAllPlans();

        // Format for frontend display
        const formattedPlans = plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthly_price_display,
            annualPrice: plan.annual_price_display,
            annualMonthlyPrice: plan.annual_monthly_price,
            maxWaitlists: plan.max_waitlists,
            maxSignupsPerMonth: plan.max_signups_per_month,
            maxTeamMembers: plan.max_team_members,
            features: plan.features,
            isPopular: plan.id === 'growth', // Mark Growth as popular
            isEnterprise: plan.id === 'enterprise'
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
router.get('/current', authenticateToken, (req, res) => {
    try {
        const subscription = Subscription.findByUserId(req.user.id);
        const limits = Subscription.getUserLimits(req.user.id);

        res.json({
            subscription: subscription ? {
                id: subscription.id,
                planId: subscription.plan_id,
                planName: subscription.plan_name,
                billingCycle: subscription.billing_cycle,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end
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
 * Subscribe to a plan
 */
router.post('/subscribe', authenticateToken, (req, res) => {
    try {
        const { planId, billingCycle = 'monthly' } = req.body;

        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        // Check if plan exists
        const plan = Subscription.getPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Check for enterprise plan
        if (planId === 'enterprise') {
            return res.status(400).json({
                error: 'Enterprise plans require contacting sales',
                contactSales: true
            });
        }

        // Check if user already has active subscription
        const existingSub = Subscription.findByUserId(req.user.id);
        if (existingSub) {
            return res.status(400).json({
                error: 'You already have an active subscription. Please upgrade or cancel first.',
                hasExisting: true
            });
        }

        // Create subscription
        const subscription = Subscription.create(req.user.id, planId, billingCycle);

        res.status(201).json({
            message: 'Successfully subscribed',
            subscription: {
                id: subscription.id,
                planId: subscription.plan_id,
                planName: subscription.plan_name,
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
router.put('/change', authenticateToken, (req, res) => {
    try {
        const { planId, billingCycle } = req.body;

        const existingSub = Subscription.findByUserId(req.user.id);
        if (!existingSub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        if (planId === 'enterprise') {
            return res.status(400).json({
                error: 'Enterprise plans require contacting sales',
                contactSales: true
            });
        }

        const updates = {};
        if (planId) updates.plan_id = planId;
        if (billingCycle) updates.billing_cycle = billingCycle;

        const updated = Subscription.update(existingSub.id, updates);

        res.json({
            message: 'Subscription updated',
            subscription: {
                id: updated.id,
                planId: updated.plan_id,
                planName: updated.plan_name,
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
router.post('/cancel', authenticateToken, (req, res) => {
    try {
        const existingSub = Subscription.findByUserId(req.user.id);
        if (!existingSub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        Subscription.cancel(existingSub.id);

        res.json({
            message: 'Subscription cancelled',
            effectiveUntil: existingSub.current_period_end
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

module.exports = router;
