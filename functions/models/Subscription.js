const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

const PLANS_COLLECTION = 'subscription_plans';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

class Subscription {
    // ==================== PLANS ====================

    /**
     * Create a subscription plan
     */
    static async createPlan({ name, description = '', monthlyPrice = 0, annualPrice = 0, maxWaitlists = null, maxSignupsPerMonth = null, maxTeamMembers = 1, features = [], sortOrder = 0 }) {
        const id = nanoid(20);

        const planData = {
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
        };

        await db.collection(PLANS_COLLECTION).doc(id).set(planData);
        return this.findPlanById(id);
    }

    /**
     * Find plan by ID
     */
    static async findPlanById(id) {
        const doc = await db.collection(PLANS_COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Get all active plans
     */
    static async getAllPlans() {
        const snapshot = await db.collection(PLANS_COLLECTION)
            .where('is_active', '==', true)
            .orderBy('sort_order', 'asc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // ==================== SUBSCRIPTIONS ====================

    /**
     * Create a subscription for a user
     */
    static async createSubscription({ userId, planId, billingCycle = 'monthly' }) {
        const id = nanoid(20);
        const now = new Date();
        const periodEnd = new Date(now);

        if (billingCycle === 'annual') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const subscriptionData = {
            user_id: userId,
            plan_id: planId,
            billing_cycle: billingCycle,
            status: 'active',
            current_period_start: FieldValue.serverTimestamp(),
            current_period_end: periodEnd,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            cancelled_at: null
        };

        await db.collection(SUBSCRIPTIONS_COLLECTION).doc(id).set(subscriptionData);
        return this.findSubscriptionById(id);
    }

    /**
     * Find subscription by ID
     */
    static async findSubscriptionById(id) {
        const doc = await db.collection(SUBSCRIPTIONS_COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find active subscription for a user
     */
    static async findActiveByUserId(userId) {
        const snapshot = await db.collection(SUBSCRIPTIONS_COLLECTION)
            .where('user_id', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Cancel subscription
     */
    static async cancel(id) {
        await db.collection(SUBSCRIPTIONS_COLLECTION).doc(id).update({
            status: 'cancelled',
            cancelled_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        });
        return this.findSubscriptionById(id);
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
}

module.exports = Subscription;
