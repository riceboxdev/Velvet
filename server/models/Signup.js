const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');
const Waitlist = require('./Waitlist');

const COLLECTION = 'signups';

class Signup {
    /**
     * Create a new signup
     */
    static async create({ waitlistId, email, referredBy = null, metadata = {}, ipAddress = null, userAgent = null }) {
        const id = nanoid(20);
        const referralCode = nanoid(10);

        // Get current position (count of existing signups + 1)
        const countSnapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .count()
            .get();
        const position = countSnapshot.data().count + 1;

        const signupData = {
            waitlist_id: waitlistId,
            email: email.toLowerCase().trim(),
            referral_code: referralCode,
            referred_by: referredBy,
            referral_count: 0,
            priority: 0,
            position,
            status: 'waiting',
            metadata,
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: FieldValue.serverTimestamp(),
            verified_at: null,
            admitted_at: null
        };

        await db.collection(COLLECTION).doc(id).set(signupData);

        // Update referrer's count and priority if referred
        if (referredBy) {
            await this.incrementReferralCount(referredBy);
        }

        // Increment waitlist total
        await Waitlist.incrementSignups(waitlistId);

        return this.findById(id);
    }

    /**
     * Find signup by ID
     */
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find signup by email within a waitlist
     */
    static async findByEmail(waitlistId, email) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('email', '==', email.toLowerCase().trim())
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find signup by referral code
     */
    static async findByReferralCode(referralCode) {
        const snapshot = await db.collection(COLLECTION)
            .where('referral_code', '==', referralCode)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find signups for a waitlist with pagination and filtering
     */
    static async findByWaitlist(waitlistId, { limit = 100, offset = 0, status = null, sortBy = 'position', order = 'asc' } = {}) {
        let query = db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId);

        if (status) {
            query = query.where('status', '==', status);
        }

        // Firestore doesn't support offset directly, so we'll use this approach
        const validSortFields = ['position', 'created_at', 'referral_count', 'priority'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'position';
        const sortOrder = order.toLowerCase() === 'desc' ? 'desc' : 'asc';

        query = query.orderBy(sortField, sortOrder).limit(limit);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Get leaderboard for a waitlist
     */
    static async getLeaderboard(waitlistId, limit = 10) {
        const snapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('status', '!=', 'admitted')
            .orderBy('status')
            .orderBy('priority', 'desc')
            .orderBy('referral_count', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Increment referral count for a signup
     */
    static async incrementReferralCount(referralCode) {
        const signup = await this.findByReferralCode(referralCode);
        if (!signup) return;

        await db.collection(COLLECTION).doc(signup.id).update({
            referral_count: FieldValue.increment(1),
            priority: FieldValue.increment(10)
        });
    }

    /**
     * Verify a signup
     */
    static async verify(id) {
        await db.collection(COLLECTION).doc(id).update({
            status: 'verified',
            verified_at: FieldValue.serverTimestamp()
        });
        return this.findById(id);
    }

    /**
     * Admit/offboard a signup
     */
    static async offboard(id) {
        await db.collection(COLLECTION).doc(id).update({
            status: 'admitted',
            admitted_at: FieldValue.serverTimestamp()
        });
        return this.findById(id);
    }

    /**
     * Advance priority
     */
    static async advancePriority(id, amount = 100) {
        await db.collection(COLLECTION).doc(id).update({
            priority: FieldValue.increment(amount)
        });
        return this.findById(id);
    }

    /**
     * Delete a signup
     */
    static async delete(id) {
        const signup = await this.findById(id);
        if (signup) {
            await db.collection(COLLECTION).doc(id).delete();
            await Waitlist.decrementSignups(signup.waitlist_id);
        }
        return true;
    }

    /**
     * Get position for a specific email
     */
    static async getPosition(waitlistId, email) {
        const signup = await this.findByEmail(waitlistId, email);
        if (!signup) return null;

        // Count how many are ahead based on priority/position
        const aheadSnapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('status', '!=', 'admitted')
            .where('priority', '>', signup.priority)
            .count()
            .get();

        // Also count those with same priority but earlier position
        const samePriorityAheadSnapshot = await db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId)
            .where('status', '!=', 'admitted')
            .where('priority', '==', signup.priority)
            .where('position', '<', signup.position)
            .count()
            .get();

        const current_position = aheadSnapshot.data().count + samePriorityAheadSnapshot.data().count + 1;

        return { ...signup, current_position };
    }

    /**
     * Count signups for a waitlist
     */
    static async count(waitlistId, status = null) {
        let query = db.collection(COLLECTION)
            .where('waitlist_id', '==', waitlistId);

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.count().get();
        return snapshot.data().count;
    }
}

module.exports = Signup;
