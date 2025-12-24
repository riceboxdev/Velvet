const Stripe = require('stripe');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { db } = require('../config/database');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map our plan names to Stripe price IDs (configured in Stripe Dashboard)
// These should be set in environment variables for production
const PLAN_PRICE_MAP = {
    basic_monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    basic_annual: process.env.STRIPE_PRICE_BASIC_ANNUAL,
    advanced_monthly: process.env.STRIPE_PRICE_ADVANCED_MONTHLY,
    advanced_annual: process.env.STRIPE_PRICE_ADVANCED_ANNUAL,
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL
};

class StripeService {
    /**
     * Create or get Stripe customer for a user
     */
    static async getOrCreateCustomer(userId) {
        const user = await User.findById(userId);

        if (user.stripe_customer_id) {
            return user.stripe_customer_id;
        }

        // Create new customer in Stripe
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || user.email,
            metadata: {
                velvet_user_id: userId
            }
        });

        // Save customer ID to user
        await db.collection('users').doc(userId).update({
            stripe_customer_id: customer.id
        });

        return customer.id;
    }

    /**
     * Create Stripe Checkout session for subscription
     */
    static async createCheckoutSession({ userId, planName, billingCycle, successUrl, cancelUrl }) {
        const customerId = await this.getOrCreateCustomer(userId);

        const priceKey = `${planName.toLowerCase()}_${billingCycle}`;
        const priceId = PLAN_PRICE_MAP[priceKey];

        if (!priceId) {
            throw new Error(`No Stripe price configured for ${priceKey}`);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            success_url: successUrl || `${process.env.CLIENT_URL}/account/billing?success=true`,
            cancel_url: cancelUrl || `${process.env.CLIENT_URL}/account/billing?canceled=true`,
            subscription_data: {
                metadata: {
                    velvet_user_id: userId,
                    plan_name: planName
                }
            },
            metadata: {
                velvet_user_id: userId,
                plan_name: planName,
                billing_cycle: billingCycle
            }
        });

        return session;
    }

    /**
     * Create Stripe Customer Portal session for billing management
     */
    static async createPortalSession({ userId, returnUrl }) {
        const customerId = await this.getOrCreateCustomer(userId);

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${process.env.CLIENT_URL}/account/billing`
        });

        return session;
    }

    /**
     * Handle Stripe webhook events
     */
    static async handleWebhook(event) {
        console.log(`[Stripe] Processing webhook: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutComplete(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionCanceled(event.data.object);
                break;

            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`[Stripe] Unhandled event type: ${event.type}`);
        }
    }

    /**
     * Handle successful checkout
     */
    static async handleCheckoutComplete(session) {
        const userId = session.metadata?.velvet_user_id;
        const planName = session.metadata?.plan_name;
        const billingCycle = session.metadata?.billing_cycle;

        if (!userId || !planName) {
            console.error('[Stripe] Missing metadata in checkout session');
            return;
        }

        console.log(`[Stripe] Checkout complete for user ${userId}, plan: ${planName}`);

        // Find the plan in our database
        const plans = await Subscription.getAllPlans();
        const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());

        if (!plan) {
            console.error(`[Stripe] Plan not found: ${planName}`);
            return;
        }

        // Create or update subscription in our database
        const existingSub = await Subscription.findActiveByUserId(userId);

        if (existingSub) {
            await Subscription.update(existingSub.id, {
                plan_id: plan.id,
                billing_cycle: billingCycle,
                status: 'active',
                stripe_subscription_id: session.subscription
            });
        } else {
            await Subscription.createSubscription({
                userId,
                planId: plan.id,
                billingCycle,
                stripeSubscriptionId: session.subscription
            });
        }
    }

    /**
     * Handle subscription updates from Stripe
     */
    static async handleSubscriptionUpdate(subscription) {
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const usersSnapshot = await db.collection('users')
            .where('stripe_customer_id', '==', customerId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error(`[Stripe] No user found for customer: ${customerId}`);
            return;
        }

        const userId = usersSnapshot.docs[0].id;

        // Get price to determine plan
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = this.getPlanNameFromPriceId(priceId);
        const billingCycle = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

        if (!planName) {
            console.error(`[Stripe] Unknown price ID: ${priceId}`);
            return;
        }

        // Find plan in our database
        const plans = await Subscription.getAllPlans();
        const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());

        if (!plan) {
            console.error(`[Stripe] Plan not found: ${planName}`);
            return;
        }

        // Map Stripe status to our status
        let status = 'active';
        if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'canceled') status = 'cancelled';
        else if (subscription.status === 'unpaid') status = 'suspended';

        // Update our subscription
        const existingSub = await Subscription.findActiveByUserId(userId);

        if (existingSub) {
            await Subscription.update(existingSub.id, {
                plan_id: plan.id,
                billing_cycle: billingCycle,
                status,
                stripe_subscription_id: subscription.id,
                current_period_end: new Date(subscription.current_period_end * 1000)
            });
        }

        console.log(`[Stripe] Subscription updated for user ${userId}: ${planName} (${status})`);
    }

    /**
     * Handle subscription cancellation
     */
    static async handleSubscriptionCanceled(subscription) {
        const customerId = subscription.customer;

        const usersSnapshot = await db.collection('users')
            .where('stripe_customer_id', '==', customerId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) return;

        const userId = usersSnapshot.docs[0].id;
        const existingSub = await Subscription.findActiveByUserId(userId);

        if (existingSub) {
            await Subscription.cancel(existingSub.id);
            console.log(`[Stripe] Subscription canceled for user ${userId}`);
        }
    }

    /**
     * Handle failed payment
     */
    static async handlePaymentFailed(invoice) {
        const customerId = invoice.customer;

        const usersSnapshot = await db.collection('users')
            .where('stripe_customer_id', '==', customerId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) return;

        const userId = usersSnapshot.docs[0].id;
        const existingSub = await Subscription.findActiveByUserId(userId);

        if (existingSub) {
            await Subscription.update(existingSub.id, {
                status: 'past_due'
            });
            console.log(`[Stripe] Payment failed for user ${userId}, marked as past_due`);
        }
    }

    /**
     * Get plan name from Stripe price ID
     */
    static getPlanNameFromPriceId(priceId) {
        for (const [key, value] of Object.entries(PLAN_PRICE_MAP)) {
            if (value === priceId) {
                return key.split('_')[0]; // e.g., 'basic_monthly' -> 'basic'
            }
        }
        return null;
    }

    /**
     * Get Stripe instance for direct API calls
     */
    static getStripe() {
        return stripe;
    }
}

module.exports = StripeService;
