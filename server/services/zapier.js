const ZapierHook = require('../models/ZapierHook');

/**
 * Zapier Service
 * Handles sending events to registered Zapier webhooks
 */
class ZapierService {
    constructor() {
        // Timeout settings for Zapier (per their docs)
        this.connectionTimeout = 30000; // 30 seconds to establish connection
        this.responseTimeout = 90000;   // 90 seconds to receive response
    }

    /**
     * Format signup data for Zapier
     * Matches the schema expected by Zapier (similar to GetWaitlist)
     */
    formatSignupForZapier(signup, waitlist) {
        const baseUrl = process.env.BASE_URL || 'https://velvet.app';
        const referralLink = `${baseUrl}/join/${waitlist.id}?ref=${signup.referral_code}`;

        return {
            // Core identifiers
            id: signup.id,
            uuid: signup.id,
            waitlist_id: waitlist.id,
            waitlist_name: waitlist.name,

            // Contact info
            email: signup.email,
            first_name: signup.metadata?.first_name || null,
            last_name: signup.metadata?.last_name || null,
            phone: signup.metadata?.phone || null,

            // Position & Priority
            position: signup.position,
            priority: signup.priority,

            // Referral info
            referral_code: signup.referral_code,
            referral_token: signup.referral_code, // Alias for compatibility
            referral_link: referralLink,
            referral_count: signup.referral_count || 0,
            amount_referred: signup.referral_count || 0, // Alias for compatibility
            referred_by: signup.referred_by,
            referred_by_signup_token: signup.referred_by,

            // Status
            status: signup.status,
            verified: signup.status === 'verified' || signup.verified_at !== null,

            // Timestamps
            created_at: this.formatTimestamp(signup.created_at),
            verified_at: this.formatTimestamp(signup.verified_at),
            admitted_at: this.formatTimestamp(signup.admitted_at),
            removed_date: signup.status === 'admitted' ? this.formatTimestamp(signup.admitted_at) : null,
            removed_priority: signup.status === 'admitted' ? signup.priority : null,

            // Custom data
            metadata: signup.metadata || {},
            answers: signup.metadata?.answers || []
        };
    }

    /**
     * Format timestamp for Zapier
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return null;

        // Handle Firestore Timestamp
        if (timestamp._seconds) {
            return new Date(timestamp._seconds * 1000).toISOString();
        }

        // Handle regular Date or string
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }

        return timestamp;
    }

    /**
     * Send event to a single webhook URL
     */
    async sendToHook(hookUrl, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.responseTimeout);

        try {
            const response = await fetch(hookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Velvet-Zapier/1.0'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[Zapier] Hook returned ${response.status}: ${hookUrl}`);
                return false;
            }

            console.log(`[Zapier] Successfully sent to: ${hookUrl}`);
            return true;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.error(`[Zapier] Request timeout for: ${hookUrl}`);
            } else {
                console.error(`[Zapier] Failed to send to ${hookUrl}:`, error.message);
            }
            return false;
        }
    }

    /**
     * Broadcast event to all registered hooks
     */
    async broadcastEvent(waitlistId, event, data) {
        try {
            const hooks = await ZapierHook.findActiveByEvent(waitlistId, event);

            if (hooks.length === 0) {
                console.log(`[Zapier] No active hooks for event '${event}' on waitlist ${waitlistId}`);
                return;
            }

            console.log(`[Zapier] Broadcasting '${event}' to ${hooks.length} hook(s)`);

            // Send to all hooks in parallel (fire and forget pattern)
            const promises = hooks.map(hook => this.sendToHook(hook.hook_url, data));
            await Promise.allSettled(promises);
        } catch (error) {
            console.error(`[Zapier] Error broadcasting event:`, error.message);
        }
    }

    /**
     * Trigger: New Signup
     * Called when a new user signs up for the waitlist
     */
    async sendNewSignupEvent(signup, waitlist) {
        const data = this.formatSignupForZapier(signup, waitlist);
        await this.broadcastEvent(waitlist.id, 'new_signup', data);
    }

    /**
     * Trigger: New Referrer
     * Called when an existing user successfully refers someone new
     */
    async sendReferrerEvent(referrer, waitlist) {
        const data = this.formatSignupForZapier(referrer, waitlist);
        await this.broadcastEvent(waitlist.id, 'new_referrer', data);
    }

    /**
     * Trigger: Offboard
     * Called when a user is offboarded/admitted from the waitlist
     */
    async sendOffboardEvent(signup, waitlist) {
        const data = this.formatSignupForZapier(signup, waitlist);
        await this.broadcastEvent(waitlist.id, 'offboard', data);
    }
}

module.exports = new ZapierService();
