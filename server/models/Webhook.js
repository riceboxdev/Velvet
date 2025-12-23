const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

const COLLECTION = 'webhooks';

class Webhook {
    /**
     * Create a new webhook
     */
    static async create({ waitlistId, url, events = ['new_signup', 'offboarded'], secret = null }) {
        const id = nanoid(20);
        const webhookSecret = secret || `whsec_${nanoid(32)}`;

        const webhookData = {
            waitlist_id: waitlistId,
            url,
            events,
            secret: webhookSecret,
            is_active: true,
            created_at: FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION).doc(id).set(webhookData);
        return this.findById(id);
    }

    /**
     * Find webhook by ID
     */
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find all webhooks for a waitlist
     */
    static async findByWaitlistId(waitlistId) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Update webhook
     */
    static async update(id, updates) {
        const allowedFields = ['url', 'events', 'is_active'];
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
     * Delete webhook
     */
    static async delete(id) {
        await db.collection(COLLECTION).doc(id).delete();
        return true;
    }

    /**
     * Get active webhooks for an event
     */
    static async getActiveForEvent(waitlistId, event) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('is_active', '==', true)
            .get();

        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(webhook => webhook.events.includes(event));
    }
}

module.exports = Webhook;
