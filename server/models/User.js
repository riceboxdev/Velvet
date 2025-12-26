const { supabase } = require('../config/supabase');

const TABLE = 'users';

class User {
    /**
     * Create a new user document (called after Clerk signup)
     */
    static async create({ id, email, name = '' }) {
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                id,
                email: email.toLowerCase().trim(),
                name,
                is_admin: false,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[User.create] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find user by ID (Clerk user ID)
     */
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[User.findById] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[User.findByEmail] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Create or update user (upsert)
     */
    static async upsert({ id, email, name = '' }) {
        const { data, error } = await supabase
            .from(TABLE)
            .upsert({
                id,
                email: email.toLowerCase().trim(),
                name,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('[User.upsert] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update user
     */
    static async update(id, updates) {
        const allowedFields = ['name', 'email', 'bio', 'website', 'company', 'photo_url'];
        const updateData = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = field === 'email'
                    ? updates[field].toLowerCase().trim()
                    : updates[field];
            }
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[User.update] Error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update last login timestamp
     */
    static async updateLastLogin(id) {
        const { error } = await supabase
            .from(TABLE)
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('[User.updateLastLogin] Error:', error);
        }
    }

    /**
     * Delete user
     */
    static async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[User.delete] Error:', error);
            throw error;
        }

        return true;
    }

    /**
     * Check if email exists
     */
    static async emailExists(email) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[User.emailExists] Error:', error);
            throw error;
        }

        return !!data;
    }

    /**
     * Set admin status
     */
    static async setAdmin(id, isAdmin) {
        const { data, error } = await supabase
            .from(TABLE)
            .update({ is_admin: isAdmin })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[User.setAdmin] Error:', error);
            throw error;
        }

        return data;
    }
}

module.exports = User;
