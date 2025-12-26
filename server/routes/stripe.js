const express = require('express');
const router = express.Router();
const StripeService = require('../services/stripeService');
const { authenticateToken } = require('../middleware/clerk');

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { planName, billingCycle = 'monthly' } = req.body;

        if (!planName) {
            return res.status(400).json({ error: 'Plan name is required' });
        }

        const validPlans = ['basic', 'advanced', 'pro'];
        if (!validPlans.includes(planName.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid plan name' });
        }

        const validCycles = ['monthly', 'annual'];
        if (!validCycles.includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }

        const session = await StripeService.createCheckoutSession({
            userId: req.user.id,
            planName,
            billingCycle,
            successUrl: req.body.successUrl,
            cancelUrl: req.body.cancelUrl
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('[Stripe] Checkout session error:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            details: error.message
        });
    }
});

/**
 * POST /api/stripe/create-portal-session
 * Create a Stripe Customer Portal session for billing management
 */
router.post('/create-portal-session', authenticateToken, async (req, res) => {
    try {
        const session = await StripeService.createPortalSession({
            userId: req.user.id,
            returnUrl: req.body.returnUrl
        });

        res.json({
            success: true,
            url: session.url
        });
    } catch (error) {
        console.error('[Stripe] Portal session error:', error);
        res.status(500).json({
            error: 'Failed to create portal session',
            details: error.message
        });
    }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 * Note: This endpoint should NOT use authenticateToken middleware
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        const stripe = StripeService.getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('[Stripe] Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
        await StripeService.handleWebhook(event);
        res.json({ received: true });
    } catch (error) {
        console.error('[Stripe] Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * GET /api/stripe/prices
 * Get available Stripe prices (for debugging/admin)
 */
router.get('/prices', authenticateToken, async (req, res) => {
    try {
        const stripe = StripeService.getStripe();
        const prices = await stripe.prices.list({
            active: true,
            expand: ['data.product']
        });

        res.json({
            success: true,
            prices: prices.data.map(p => ({
                id: p.id,
                product: p.product.name,
                unit_amount: p.unit_amount,
                currency: p.currency,
                interval: p.recurring?.interval
            }))
        });
    } catch (error) {
        console.error('[Stripe] Get prices error:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

module.exports = router;
