const { supabase } = require('../config/supabase');
const { nanoid } = require('nanoid');

const PLANS_TABLE = 'subscription_plans';
const SUBSCRIPTIONS_TABLE = 'subscriptions';

class Subscription {
    // ==================== PLANS ====================

    /**
     * Create a subscription plan
     */
    static async createPlan({ name, description = '', monthlyPrice = 0, annualPrice = 0, maxWaitlists = null, maxSignupsPerMonth = null, maxTeamMembers = 1, features = [], sortOrder = 0 }) {
        const id = nanoid(20);

        const { data, error } = await supabase
            .from(PLANS_TABLE)
            .insert({
                id,
                name,
                description,
                monthly_price: monthlyPrice,
                annual_price: annualPrice,
                max_waitlists: maxWaitlists,
                max_signups_per_month: maxSignupsPerMonth,
                max_team_members: maxTeamMembers,
                features,
                is_active: true,
                sort_order: sortOrder
            })
            .select()
            .single();

        if (error) {
            console.error('[Subscription.createPlan] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find plan by ID
     */
    static async findPlanById(id) {
        const { data, error } = await supabase
            .from(PLANS_TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Subscription.findPlanById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get all active plans
     */
    static async getAllPlans() {
        const { data, error } = await supabase
            .from(PLANS_TABLE)
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('[Subscription.getAllPlans] Error:', error);
            throw error;
        }

        return data || [];
    }

    // ==================== SUBSCRIPTIONS ====================

    /**
     * Create a subscription for a user
     */
    static async createSubscription({ userId, planId, billingCycle = 'monthly', stripeSubscriptionId = null }) {
        const id = nanoid(20);
        const now = new Date();
        const periodEnd = new Date(now);

        if (billingCycle === 'annual') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { data, error } = await supabase
            .from(SUBSCRIPTIONS_TABLE)
            .insert({
                id,
                user_id: userId,
                plan_id: planId,
                billing_cycle: billingCycle,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                stripe_subscription_id: stripeSubscriptionId
            })
            .select()
            .single();

        if (error) {
            console.error('[Subscription.createSubscription] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update subscription
     */
    static async update(id, updates) {
        const allowedFields = [
            'plan_id', 'billing_cycle', 'status',
            'current_period_end', 'stripe_subscription_id',
            'cancelled_at'
        ];

        const sanitizedUpdates = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                sanitizedUpdates[key] = updates[key];
            }
        }

        const { data, error } = await supabase
            .from(SUBSCRIPTIONS_TABLE)
            .update(sanitizedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Subscription.update] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find subscription by ID
     */
    static async findSubscriptionById(id) {
        const { data, error } = await supabase
            .from(SUBSCRIPTIONS_TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Subscription.findSubscriptionById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find active subscription for a user
     */
    static async findActiveByUserId(userId) {
        const { data, error } = await supabase
            .from(SUBSCRIPTIONS_TABLE)
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Subscription.findActiveByUserId] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Cancel subscription
     */
    static async cancel(id) {
        const { data, error } = await supabase
            .from(SUBSCRIPTIONS_TABLE)
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Subscription.cancel] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get user's subscription with plan details
     */
    static async getUserSubscription(userId) {
        const subscription = await this.findActiveByUserId(userId);
        if (!subscription) return null;

        const plan = await this.findPlanById(subscription.plan_id);
        return { ...subscription, plan };
    }

    // ==================== ALIASES & HELPERS ====================

    static async getPlanById(id) {
        return this.findPlanById(id);
    }

    static async findByUserId(userId) {
        return this.findActiveByUserId(userId);
    }

    static async getUserLimits(userId) {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription || !subscription.plan) {
            // Default Free Tier Limits
            return {
                max_waitlists: 1,
                max_signups_per_month: 100,
                max_team_members: 1,
                features: [],
                plan_name: 'Free',
                has_subscription: false
            };
        }

        return {
            max_waitlists: subscription.plan.max_waitlists,
            max_signups_per_month: subscription.plan.max_signups_per_month,
            max_team_members: subscription.plan.max_team_members,
            features: subscription.plan.features,
            plan_name: subscription.plan.name,
            has_subscription: true
        };
    }
}

module.exports = Subscription;
