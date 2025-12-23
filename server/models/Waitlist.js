const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

const COLLECTION = 'waitlists';

class Waitlist {
    /**
     * Create a new waitlist
     */
    static async create({ name, description = '', userId }) {
        const id = nanoid(20);
        const apiKey = `wl_${nanoid(32)}`;

        const waitlistData = {
            user_id: userId,
            name,
            description,
            api_key: apiKey,
            settings: {},
            total_signups: 0,
            is_active: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION).doc(id).set(waitlistData);
        return this.findById(id);
    }

    /**
     * Find waitlist by ID
     */
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find waitlist by API key
     */
    static async findByApiKey(apiKey) {
        const snapshot = await db.collection(COLLECTION)
            .where('api_key', '==', apiKey)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find all waitlists for a user
     */
    static async findByUserId(userId) {
        const snapshot = await db.collection(COLLECTION)
            .where('user_id', '==', userId)
            .get();

        const waitlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort in memory to avoid composite index requirement
        return waitlists.sort((a, b) => {
            const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(0);
            const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(0);
            return dateB - dateA;
        });
    }

    /**
     * Find all waitlists
     */
    static async findAll() {
        const snapshot = await db.collection(COLLECTION)
            .orderBy('created_at', 'desc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Update waitlist
     */
    static async update(id, updates) {
        const allowedFields = ['name', 'description', 'settings', 'is_active'];
        const updateData = { updated_at: FieldValue.serverTimestamp() };

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateData[key] = value;
            }
        }

        await db.collection(COLLECTION).doc(id).update(updateData);
        return this.findById(id);
    }

    /**
     * Delete waitlist
     */
    static async delete(id) {
        // Also delete all signups for this waitlist
        const signupsSnapshot = await db.collection('signups')
            .where('waitlist_id', '==', id)
            .get();

        const batch = db.batch();
        signupsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection(COLLECTION).doc(id));

        await batch.commit();
        return true;
    }

    /**
     * Get waitlist statistics
     */
    static async getStats(id) {
        const signupsSnapshot = await db.collection('signups')
            .where('waitlist_id', '==', id)
            .get();

        let stats = {
            total_signups: 0,
            waiting: 0,
            verified: 0,
            admitted: 0,
            total_referrals: 0
        };

        signupsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            stats.total_signups++;
            if (data.status === 'waiting') stats.waiting++;
            if (data.status === 'verified') stats.verified++;
            if (data.status === 'admitted') stats.admitted++;
            stats.total_referrals += data.referral_count || 0;
        });

        return stats;
    }

    /**
     * Increment total signups count
     */
    static async incrementSignups(id) {
        await db.collection(COLLECTION).doc(id).update({
            total_signups: FieldValue.increment(1)
        });
    }

    /**
     * Decrement total signups count
     */
    static async decrementSignups(id) {
        await db.collection(COLLECTION).doc(id).update({
            total_signups: FieldValue.increment(-1)
        });
    }

    /**
     * Regenerate API key
     */
    static async regenerateApiKey(id) {
        const newApiKey = `wl_${nanoid(32)}`;
        await db.collection(COLLECTION).doc(id).update({
            api_key: newApiKey,
            updated_at: FieldValue.serverTimestamp()
        });
        return this.findById(id);
    }
}

module.exports = Waitlist;
