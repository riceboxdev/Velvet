require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('[Supabase] Please set these environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('[Supabase] Client initialized for:', supabaseUrl);

module.exports = { supabase };
