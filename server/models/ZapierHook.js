const { supabase } = require('../config/supabase');
const { nanoid } = require('nanoid');

const TABLE = 'zapier_hooks';

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

        const id = `zh_${nanoid(20)}`;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                id,
                waitlist_id: waitlistId,
                hook_url: hookUrl,
                event_type: event,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[ZapierHook.create] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find hook by ID
     */
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[ZapierHook.findById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find all hooks for a waitlist
     */
    static async findByWaitlistId(waitlistId) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId);

        if (error) {
            console.error('[ZapierHook.findByWaitlistId] Error:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Find active hooks for a specific event
     */
    static async findActiveByEvent(waitlistId, event) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId)
            .eq('event_type', event)
            .eq('is_active', true);

        if (error) {
            console.error('[ZapierHook.findActiveByEvent] Error:', error);
            throw error;
        }

        return data || [];
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

        if (Object.keys(updateData).length === 0) {
            return this.findById(id);
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[ZapierHook.update] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Delete hook
     */
    static async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[ZapierHook.delete] Error:', error);
            throw error;
        }

        return true;
    }

    /**
     * Delete all hooks for a waitlist
     */
    static async deleteByWaitlistId(waitlistId) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('waitlist_id', waitlistId);

        if (error) {
            console.error('[ZapierHook.deleteByWaitlistId] Error:', error);
            throw error;
        }

        return true;
    }
}

module.exports = ZapierHook;
