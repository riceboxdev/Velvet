const { supabase } = require('../config/supabase');
const { nanoid } = require('nanoid');

const TABLE = 'webhooks';

class Webhook {
    /**
     * Create a new webhook
     */
    static async create({ waitlistId, url, events = ['new_signup', 'offboarded'], secret = null }) {
        const id = `wh_${nanoid(20)}`;
        const webhookSecret = secret || `whsec_${nanoid(32)}`;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                id,
                waitlist_id: waitlistId,
                url,
                events,
                secret: webhookSecret,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[Webhook.create] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find webhook by ID
     */
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Webhook.findById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find all webhooks for a waitlist
     */
    static async findByWaitlistId(waitlistId) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId);

        if (error) {
            console.error('[Webhook.findByWaitlistId] Error:', error);
            throw error;
        }

        return data || [];
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
            console.error('[Webhook.update] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Delete webhook
     */
    static async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Webhook.delete] Error:', error);
            throw error;
        }

        return true;
    }

    /**
     * Get active webhooks for an event
     */
    static async getActiveForEvent(waitlistId, event) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('waitlist_id', waitlistId)
            .eq('is_active', true)
            .contains('events', [event]);

        if (error) {
            console.error('[Webhook.getActiveForEvent] Error:', error);
            throw error;
        }

        return data || [];
    }
}

module.exports = Webhook;
