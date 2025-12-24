const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

const COLLECTION = 'zapier_hooks';

/**
 * Valid Zapier event types
 */
const ZAPIER_EVENTS = ['new_signup', 'new_referrer', 'offboard'];

class ZapierHook {
    /**
     * Get valid event types
     */
    static getValidEvents() {
        return ZAPIER_EVENTS;
    }

    /**
     * Create a new Zapier hook subscription
     */
    static async create({ waitlistId, hookUrl, event }) {
        if (!ZAPIER_EVENTS.includes(event)) {
            throw new Error(`Invalid event type. Must be one of: ${ZAPIER_EVENTS.join(', ')}`);
        }

        const id = nanoid(20);

        const hookData = {
            waitlist_id: waitlistId,
            hook_url: hookUrl,
            event,
            is_active: true,
            created_at: FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION).doc(id).set(hookData);
        return this.findById(id);
    }

    /**
     * Find hook by ID
     */
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find all hooks for a waitlist
     */
    static async findByWaitlistId(waitlistId) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Find active hooks for a specific event
     */
    static async findActiveByEvent(waitlistId, event) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('event', '==', event)
            .where('is_active', '==', true)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Update hook
     */
    static async update(id, updates) {
        const allowedFields = ['hook_url', 'is_active'];
        const updateData = {};

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateData[key] = value;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await db.collection(COLLECTION).doc(id).update(updateData);
        }
        return this.findById(id);
    }

    /**
     * Delete hook
     */
    static async delete(id) {
        await db.collection(COLLECTION).doc(id).delete();
        return true;
    }

    /**
     * Delete all hooks for a waitlist
     */
    static async deleteByWaitlistId(waitlistId) {
        const hooks = await this.findByWaitlistId(waitlistId);
        const batch = db.batch();

        hooks.forEach(hook => {
            batch.delete(db.collection(COLLECTION).doc(hook.id));
        });

        await batch.commit();
        return true;
    }
}

module.exports = ZapierHook;
