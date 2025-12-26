const { supabase } = require('../config/supabase');

const TABLE = 'system_settings';

class SystemSettings {
    /**
     * Get a setting by key
     */
    static async get(key) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('settings')
            .eq('id', 'global')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[SystemSettings.get] Error:', error);
            throw error;
        }

        if (!data || !data.settings) return null;
        return data.settings[key] || null;
    }

    /**
     * Set a setting
     */
    static async set(key, value, updatedBy = null) {
        // Get current settings
        const { data: existing } = await supabase
            .from(TABLE)
            .select('settings')
            .eq('id', 'global')
            .single();

        const currentSettings = existing?.settings || {};
        currentSettings[key] = value;

        const { error } = await supabase
            .from(TABLE)
            .upsert({
                id: 'global',
                settings: currentSettings,
                updated_by: updatedBy
            });

        if (error) {
            console.error('[SystemSettings.set] Error:', error);
            throw error;
        }

        return value;
    }

    /**
     * Get all settings
     */
    static async getAll() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('settings')
            .eq('id', 'global')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[SystemSettings.getAll] Error:', error);
            throw error;
        }

        return data?.settings || {};
    }

    /**
     * Delete a setting
     */
    static async delete(key) {
        // Get current settings
        const { data: existing } = await supabase
            .from(TABLE)
            .select('settings')
            .eq('id', 'global')
            .single();

        if (!existing?.settings) return true;

        const currentSettings = { ...existing.settings };
        delete currentSettings[key];

        const { error } = await supabase
            .from(TABLE)
            .update({ settings: currentSettings })
            .eq('id', 'global');

        if (error) {
            console.error('[SystemSettings.delete] Error:', error);
            throw error;
        }

        return true;
    }
}

module.exports = SystemSettings;
