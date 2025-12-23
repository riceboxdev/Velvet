const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');

const SETTINGS_COLLECTION = 'system_settings';

class SystemSettings {
    /**
     * Get a setting by key
     */
    static async get(key) {
        const doc = await db.collection(SETTINGS_COLLECTION).doc(key).get();
        if (!doc.exists) return null;
        return doc.data().value;
    }

    /**
     * Set a setting
     */
    static async set(key, value, updatedBy = null) {
        const data = {
            value: typeof value === 'object' ? JSON.stringify(value) : value,
            updated_at: FieldValue.serverTimestamp(),
            updated_by: updatedBy
        };

        await db.collection(SETTINGS_COLLECTION).doc(key).set(data, { merge: true });
        return this.get(key);
    }

    /**
     * Get all settings
     */
    static async getAll() {
        const snapshot = await db.collection(SETTINGS_COLLECTION).get();
        const settings = {};
        snapshot.docs.forEach(doc => {
            settings[doc.id] = doc.data().value;
        });
        return settings;
    }

    /**
     * Delete a setting
     */
    static async delete(key) {
        await db.collection(SETTINGS_COLLECTION).doc(key).delete();
        return true;
    }
}

module.exports = SystemSettings;
