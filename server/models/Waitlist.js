const { supabase } = require('../config/supabase');
const { nanoid } = require('nanoid');

const TABLE = 'waitlists';

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
    contactType: 'email',

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
        title: '',
        successTitle: '',
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
        items: []
    },

    // Connectors
    connectors: {
        zapier: { enabled: false },
        webhook: { url: '' },
        slack: { enabled: false },
        hubspot: { enabled: false }
    }
};

const FREE_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
    'gmx.com', 'live.com', 'msn.com', 'me.com'
];

class Waitlist {
    static getDefaultSettings() {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    static getFreeEmailDomains() {
        return FREE_EMAIL_DOMAINS;
    }

    /**
     * Create a new waitlist
     */
    static async create({ name, description = '', userId }) {
        const id = nanoid(20);
        const apiKey = `wl_${nanoid(32)}`;
        const zapierApiKey = `zap_${nanoid(32)}`;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                id,
                user_id: userId,
                name,
                description,
                api_key: apiKey,
                zapier_api_key: zapierApiKey,
                settings: DEFAULT_SETTINGS,
                total_signups: 0,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[Waitlist.create] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find waitlist by ID
     */
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Waitlist.findById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find waitlist by API key
     */
    static async findByApiKey(apiKey) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('api_key', apiKey)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Waitlist.findByApiKey] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find waitlist by Zapier API key
     */
    static async findByZapierApiKey(zapierApiKey) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('zapier_api_key', zapierApiKey)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Waitlist.findByZapierApiKey] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find all waitlists for a user
     */
    static async findByUserId(userId) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Waitlist.findByUserId] Error:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Find all waitlists
     */
    static async findAll() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Waitlist.findAll] Error:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Update waitlist
     */
    static async update(id, updates) {
        const allowedFields = ['name', 'description', 'settings', 'is_active'];
        const updateData = {};

        // Get existing waitlist to merge settings
        const existing = await this.findById(id);
        if (!existing) return null;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'settings' && value && existing.settings) {
                    updateData[key] = this.deepMerge(existing.settings, value);
                } else {
                    updateData[key] = value;
                }
            }
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Waitlist.update] Error:', error);
            throw error;
        }

        return data;
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
     * Delete waitlist (cascades to signups via FK)
     */
    static async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Waitlist.delete] Error:', error);
            throw error;
        }

        return true;
    }

    /**
     * Get waitlist statistics
     */
    static async getStats(id) {
        const { data, error } = await supabase
            .from('signups')
            .select('status, referral_count')
            .eq('waitlist_id', id);

        if (error) {
            console.error('[Waitlist.getStats] Error:', error);
            throw error;
        }

        const stats = {
            total_signups: 0,
            waiting: 0,
            verified: 0,
            admitted: 0,
            total_referrals: 0
        };

        (data || []).forEach(signup => {
            stats.total_signups++;
            if (signup.status === 'waiting') stats.waiting++;
            if (signup.status === 'verified') stats.verified++;
            if (signup.status === 'admitted') stats.admitted++;
            stats.total_referrals += signup.referral_count || 0;
        });

        return stats;
    }

    /**
     * Increment total signups count
     */
    static async incrementSignups(id) {
        const { error } = await supabase.rpc('increment_waitlist_signups', { waitlist_id: id });

        // Fallback if RPC doesn't exist
        if (error) {
            const waitlist = await this.findById(id);
            if (waitlist) {
                await supabase
                    .from(TABLE)
                    .update({ total_signups: (waitlist.total_signups || 0) + 1 })
                    .eq('id', id);
            }
        }
    }

    /**
     * Decrement total signups count
     */
    static async decrementSignups(id) {
        const waitlist = await this.findById(id);
        if (waitlist && waitlist.total_signups > 0) {
            await supabase
                .from(TABLE)
                .update({ total_signups: waitlist.total_signups - 1 })
                .eq('id', id);
        }
    }

    /**
     * Regenerate API key
     */
    static async regenerateApiKey(id) {
        const newApiKey = `wl_${nanoid(32)}`;

        const { data, error } = await supabase
            .from(TABLE)
            .update({ api_key: newApiKey })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Waitlist.regenerateApiKey] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Regenerate Zapier API key
     */
    static async regenerateZapierKey(id) {
        const newZapierKey = `zap_${nanoid(32)}`;

        const { data, error } = await supabase
            .from(TABLE)
            .update({ zapier_api_key: newZapierKey })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Waitlist.regenerateZapierKey] Error:', error);
            throw error;
        }

        return data;
    }
}

module.exports = Waitlist;
