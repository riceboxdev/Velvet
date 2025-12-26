-- Velvet Database Schema
-- Migration from Firestore to Supabase PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- Clerk user ID
    email TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT '',
    bio TEXT,
    website TEXT,
    company TEXT,
    photo_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- WAITLISTS TABLE
-- ============================================
CREATE TABLE waitlists (
    id TEXT PRIMARY KEY DEFAULT ('wl_' || substr(md5(random()::text), 1, 20)),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    api_key TEXT NOT NULL UNIQUE DEFAULT ('wl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 32)),
    zapier_api_key TEXT UNIQUE DEFAULT ('zap_' || substr(md5(random()::text || clock_timestamp()::text), 1, 32)),
    settings JSONB DEFAULT '{}'::jsonb,
    total_signups INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlists_user_id ON waitlists(user_id);
CREATE INDEX idx_waitlists_api_key ON waitlists(api_key);
CREATE INDEX idx_waitlists_zapier_api_key ON waitlists(zapier_api_key);

-- ============================================
-- SIGNUPS TABLE
-- ============================================
CREATE TABLE signups (
    id TEXT PRIMARY KEY DEFAULT ('sg_' || substr(md5(random()::text), 1, 20)),
    waitlist_id TEXT NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    referral_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 10),
    referred_by TEXT,  -- referral_code of referrer
    referral_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'verified', 'admitted')),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    verified_at TIMESTAMPTZ,
    admitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(waitlist_id, email)
);

CREATE INDEX idx_signups_waitlist_id ON signups(waitlist_id);
CREATE INDEX idx_signups_email ON signups(email);
CREATE INDEX idx_signups_referral_code ON signups(referral_code);
CREATE INDEX idx_signups_referred_by ON signups(referred_by);
CREATE INDEX idx_signups_status ON signups(status);
CREATE INDEX idx_signups_position ON signups(waitlist_id, position);
CREATE INDEX idx_signups_priority ON signups(waitlist_id, priority DESC);

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    monthly_price DECIMAL(10,2) DEFAULT 0,
    annual_price DECIMAL(10,2) DEFAULT 0,
    max_waitlists INTEGER,
    max_signups_per_month INTEGER,
    max_team_members INTEGER DEFAULT 1,
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES subscription_plans(id),
    billing_cycle TEXT DEFAULT 'monthly',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- ============================================
-- WEBHOOKS TABLE
-- ============================================
CREATE TABLE webhooks (
    id TEXT PRIMARY KEY DEFAULT ('wh_' || substr(md5(random()::text), 1, 20)),
    waitlist_id TEXT NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT ARRAY['signup.created'],
    is_active BOOLEAN DEFAULT TRUE,
    secret TEXT DEFAULT substr(md5(random()::text), 1, 32),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_waitlist_id ON webhooks(waitlist_id);

-- ============================================
-- ZAPIER HOOKS TABLE
-- ============================================
CREATE TABLE zapier_hooks (
    id TEXT PRIMARY KEY DEFAULT ('zh_' || substr(md5(random()::text), 1, 20)),
    waitlist_id TEXT NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
    hook_url TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'signup.created',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zapier_hooks_waitlist_id ON zapier_hooks(waitlist_id);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (id, settings) VALUES ('global', '{}');

-- ============================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================
-- Run this in Supabase Dashboard > Storage > Create bucket
-- Bucket name: avatars
-- Public: true (for avatar URLs)

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations via service role key (backend)
-- These policies allow the service role to do everything
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON waitlists FOR ALL USING (true);
CREATE POLICY "Service role full access" ON signups FOR ALL USING (true);
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON webhooks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON zapier_hooks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON system_settings FOR ALL USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER waitlists_updated_at BEFORE UPDATE ON waitlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get next position for a waitlist
CREATE OR REPLACE FUNCTION get_next_position(p_waitlist_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
    FROM signups
    WHERE waitlist_id = p_waitlist_id;
    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;
