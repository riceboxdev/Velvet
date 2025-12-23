const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const COLLECTION = 'users';

class User {
    /**
     * Create a new user document (called after Firebase Auth signup)
     */
    static async create({ uid, email, name = '' }) {
        const userData = {
            email: email.toLowerCase().trim(),
            name,
            is_admin: false,
            is_active: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            last_login_at: null
        };

        await db.collection(COLLECTION).doc(uid).set(userData);
        return this.findById(uid);
    }

    /**
     * Find user by ID (Firebase UID)
     */
    static async findById(uid) {
        const doc = await db.collection(COLLECTION).doc(uid).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const snapshot = await db.collection(COLLECTION)
            .where('email', '==', email.toLowerCase().trim())
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Update user
     */
    static async update(uid, updates) {
        const allowedFields = ['name', 'email'];
        const updateData = { updated_at: FieldValue.serverTimestamp() };

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = field === 'email'
                    ? updates[field].toLowerCase().trim()
                    : updates[field];
            }
        }

        await db.collection(COLLECTION).doc(uid).update(updateData);
        return this.findById(uid);
    }

    /**
     * Update last login timestamp
     */
    static async updateLastLogin(uid) {
        await db.collection(COLLECTION).doc(uid).update({
            last_login_at: FieldValue.serverTimestamp()
        });
    }

    /**
     * Delete user
     */
    static async delete(uid) {
        await db.collection(COLLECTION).doc(uid).delete();
        return true;
    }

    /**
     * Check if email exists
     */
    static async emailExists(email) {
        const snapshot = await db.collection(COLLECTION)
            .where('email', '==', email.toLowerCase().trim())
            .limit(1)
            .get();
        return !snapshot.empty;
    }

    /**
     * Set admin status
     */
    static async setAdmin(uid, isAdmin) {
        await db.collection(COLLECTION).doc(uid).update({
            is_admin: isAdmin,
            updated_at: FieldValue.serverTimestamp()
        });
        return this.findById(uid);
    }
}

module.exports = User;
