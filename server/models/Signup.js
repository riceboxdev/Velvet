const { supabase } = require('../config/supabase');
const { nanoid } = require('nanoid');

const TABLE = 'signups';

class Signup {
    /**
     * Create a new signup
     */
    static async create({ waitlistId, email, name = null, referredBy = null, metadata = {}, ipAddress = null, userAgent = null, priorityBoost = 30 }) {
        const id = `sg_${nanoid(20)}`;
        const referralCode = nanoid(10);

        // Get current position (count of existing signups + 1)
        const { count } = await supabase
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('waitlist_id', waitlistId);

        const position = (count || 0) + 1;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                id,
                waitlist_id: waitlistId,
                email: email.toLowerCase().trim(),
                name,
                referral_code: referralCode,
                referred_by: referredBy,
                referral_count: 0,
                priority: 0,
                position,
                status: 'waiting',
                metadata,
                ip_address: ipAddress,
                user_agent: userAgent
            })
            .select()
            .single();

        if (error) {
            console.error('[Signup.create] Error:', error);
            throw error;
        }

        // Update referrer's count and priority if referred
        if (referredBy) {
            await this.incrementReferralCount(referredBy, priorityBoost);
        }

        // Increment waitlist total
        const Waitlist = require('./Waitlist');
        await Waitlist.incrementSignups(waitlistId);

        return data;
    }

    /**
     * Find signup by ID
     */
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Signup.findById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find signup by email within a waitlist
     */
    static async findByEmail(waitlistId, email) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId)
            .eq('email', email.toLowerCase().trim())
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Signup.findByEmail] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find signup by referral code
     */
    static async findByReferralCode(referralCode) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('referral_code', referralCode)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Signup.findByReferralCode] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find signups for a waitlist with pagination and filtering
     */
    static async findByWaitlist(waitlistId, { limit = 100, offset = 0, status = null, sortBy = 'position', order = 'asc' } = {}) {
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId);

        if (status) {
            query = query.eq('status', status);
        }

        const validSortFields = ['position', 'created_at', 'referral_count', 'priority'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'position';
        const ascending = order.toLowerCase() !== 'desc';

        query = query
            .order(sortField, { ascending })
            .range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
            console.error('[Signup.findByWaitlist] Error:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Get leaderboard for a waitlist
     */
    static async getLeaderboard(waitlistId, limit = 10) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId)
            .neq('status', 'admitted')
            .order('priority', { ascending: false })
            .order('referral_count', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Signup.getLeaderboard] Error:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Increment referral count for a signup
     */
    static async incrementReferralCount(referralCode, priorityBoost = 10) {
        const signup = await this.findByReferralCode(referralCode);
        if (!signup) return null;

        const { error } = await supabase
            .from(TABLE)
            .update({
                referral_count: signup.referral_count + 1,
                priority: signup.priority + priorityBoost
            })
            .eq('id', signup.id);

        if (error) {
            console.error('[Signup.incrementReferralCount] Error:', error);
            throw error;
        }

        return signup;
    }

    /**
     * Verify a signup
     */
    static async verify(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .update({
                status: 'verified',
                verified_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Signup.verify] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Admit/offboard a signup
     */
    static async offboard(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .update({
                status: 'admitted',
                admitted_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Signup.offboard] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Advance priority
     */
    static async advancePriority(id, amount = 100) {
        const signup = await this.findById(id);
        if (!signup) return null;

        const { data, error } = await supabase
            .from(TABLE)
            .update({ priority: signup.priority + amount })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Signup.advancePriority] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Delete a signup
     */
    static async delete(id) {
        const signup = await this.findById(id);

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Signup.delete] Error:', error);
            throw error;
        }

        if (signup) {
            const Waitlist = require('./Waitlist');
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

        // Count how many are ahead based on priority
        const { count: aheadCount } = await supabase
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('waitlist_id', waitlistId)
            .neq('status', 'admitted')
            .gt('priority', signup.priority);

        // Count those with same priority but earlier position
        const { count: samePriorityCount } = await supabase
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('waitlist_id', waitlistId)
            .neq('status', 'admitted')
            .eq('priority', signup.priority)
            .lt('position', signup.position);

        const current_position = (aheadCount || 0) + (samePriorityCount || 0) + 1;

        return { ...signup, current_position };
    }

    /**
     * Count signups for a waitlist
     */
    static async count(waitlistId, status = null) {
        let query = supabase
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('waitlist_id', waitlistId);

        if (status) {
            query = query.eq('status', status);
        }

        const { count, error } = await query;

        if (error) {
            console.error('[Signup.count] Error:', error);
            throw error;
        }

        return count || 0;
    }
}

module.exports = Signup;
