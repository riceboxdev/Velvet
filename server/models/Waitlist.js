const { db } = require('../config/database');
const { FieldValue } = require('firebase-admin/firestore');
const { nanoid } = require('nanoid');

const COLLECTION = 'waitlists';

/**
 * Default settings schema for a waitlist
 * Mirrors GetWaitlist.com feature set
 */
const DEFAULT_SETTINGS = {
    // General
    spotsSkippedOnReferral: 3,
    hideSignupCount: false,
    hideTotalCount: false,
    rankByReferrals: false,
    closed: false,
    enableCaptcha: false,
    hideReferralLink: false,
    allowSignupDataUpdate: false,

    // Collect Info
    requireName: false,
    termsUrl: null,
    contactType: 'email', // 'email' | 'phone'

    // Redirection
    redirectOnSubmit: false,
    redirectUrl: null,

    // Email Verification
    verifySignupsByEmail: false,
    requireVerificationForReferrals: false,
    customVerificationRedirect: null,

    // Domain Restrictions
    permittedDomains: [],
    blockFreeEmails: false,
    verificationBypassDomains: [],

    // Email Notifications
    sendWelcomeEmail: false,
    emailNewSignups: true,
    emailOnReferral: false,

    sendOffboardingEmail: false,
    offboardingEmailSubject: '',
    offboardingEmailText: '',

    // Display
    hidePosition: false,

    // Leaderboard
    showLeaderboard: true,
    leaderboardSize: 5,

    // Widget Design Settings
    widget: {
        submitButtonColor: '#1400ff',
        backgroundColor: '#f4f4f4',
        fontColor: '#000000',
        buttonFontColor: '#ffffff',
        borderColor: '#cccccc',
        darkMode: false,
        transparent: false,
        title: '',  // Empty = use waitlist name
        successTitle: '',  // Empty = use default
        successDescription: '',
        signupButtonText: 'Sign Up',
        removeLabels: false,
        emailPlaceholder: 'example@getwaitlist.com',
        showBranding: true,
        logoUrl: null,
        bannerImageUrl: null
    },

    // Social Sharing Settings
    social: {
        sharingMessage: "I'm {priority} on {waitlist_name} 🔗 {referral_link}",
        enabledPlatforms: ['twitter', 'whatsapp'],
        ogTitle: 'Join the waitlist',
        ogDescription: 'Join the waitlist to be the first to know when we launch!',
        ogImage: null,
        socialLinks: {
            twitter: '',
            facebook: '',
            instagram: '',
            linkedin: '',
            pinterest: ''
        },
        showSocialLinksOnWidget: false
    },

    // Custom Questions Settings
    questions: {
        hideHeader: false,
        items: []  // Array of { id, question, answers, optional }
    },

    // Connectors
    connectors: {
        zapier: {
            enabled: false
        },
        webhook: {
            url: ''
        },
        slack: {
            enabled: false
        },
        hubspot: {
            enabled: false
        }
    }
}

// Common free email domains to block when blockFreeEmails is enabled
const FREE_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
    'gmx.com', 'live.com', 'msn.com', 'me.com'
];

class Waitlist {
    /**
     * Get default settings
     */
    static getDefaultSettings() {
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Get free email domains list
     */
    static getFreeEmailDomains() {
        return FREE_EMAIL_DOMAINS;
    }

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
            settings: { ...DEFAULT_SETTINGS },
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
            .orderBy('created_at', 'desc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

        // Get existing waitlist to merge settings
        const existing = await this.findById(id);
        if (!existing) return null;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'settings' && value && existing.settings) {
                    // Deep merge settings to preserve existing values
                    updateData[key] = this.deepMerge(existing.settings, value);
                } else {
                    updateData[key] = value;
                }
            }
        }

        await db.collection(COLLECTION).doc(id).update(updateData);
        return this.findById(id);
    }

    /**
     * Deep merge helper for settings objects
     */
    static deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
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
