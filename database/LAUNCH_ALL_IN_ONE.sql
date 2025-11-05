-- ============================================================================
-- CELORA DATABASE - ALL-IN-ONE LAUNCH SCRIPT
-- Purpose: One paste to set up schema, policies, and run validation in Supabase
-- Date: 2025-10-27
-- Notes:
--  - Safe to run multiple times (uses IF NOT EXISTS and idempotent patterns)
--  - Requires Supabase SQL Editor with admin privileges
-- ============================================================================

-- ============================================================================
-- STEP 0: REQUIRED EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists "uuid-ossp";  -- used by validator checks

-- ============================================================================
-- STEP 1: MASTER SCHEMA AND DATA SETUP
-- (Content from production-deployment.sql)
-- ============================================================================

-- Start transaction for atomic deployment
BEGIN;

-- Deploy the standardized master wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    -- Core identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Wallet naming (multiple API patterns)
    wallet_name TEXT NOT NULL DEFAULT 'My Wallet',
    name TEXT GENERATED ALWAYS AS (wallet_name) STORED, -- Legacy compatibility
    
    -- Wallet type (comprehensive enum)
    wallet_type TEXT NOT NULL CHECK (wallet_type IN (
        'personal', 'business', 'savings',           -- API /wallet route expects
        'ethereum', 'solana', 'bitcoin', 'fiat',     -- API /wallets route expects 
        'crypto', 'hybrid'                           -- supabase-schema expects
    )) DEFAULT 'personal',
    
    -- Address fields (multiple patterns)
    public_key TEXT, -- Primary address field for crypto wallets
    address TEXT GENERATED ALWAYS AS (public_key) STORED, -- Legacy compatibility
    wallet_address TEXT GENERATED ALWAYS AS (public_key) STORED, -- Legacy compatibility
    
    -- Private key storage
    encrypted_private_key TEXT,
    private_key_encrypted TEXT GENERATED ALWAYS AS (encrypted_private_key) STORED, -- Legacy compatibility
    encrypted_mnemonic TEXT,
    
    -- Network and blockchain
    network TEXT NOT NULL DEFAULT 'mainnet',
    blockchain TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN wallet_type IN ('ethereum') THEN 'ethereum'
            WHEN wallet_type IN ('solana') THEN 'solana'
            WHEN wallet_type IN ('bitcoin') THEN 'bitcoin'
            WHEN wallet_type IN ('fiat') THEN 'fiat'
            ELSE 'fiat'
        END
    ) STORED,
    
    -- Currency and balance
    currency TEXT NOT NULL DEFAULT 'USD',
    balance DECIMAL(25,8) DEFAULT 0.00000000,
    usd_balance DECIMAL(15,2) DEFAULT 0.00,
    
    -- Wallet properties
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- HD wallet support
    derivation_path TEXT,
    
    -- Sync and timestamps
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON public.wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_network ON public.wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_is_primary ON public.wallets(is_primary);
CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON public.wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON public.wallets(is_active);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Users can view own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own wallets" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own wallets" ON public.wallets
    FOR DELETE USING (auth.uid() = user_id);

-- SPL TOKEN CACHE (Jupiter/Solana token lists)
CREATE TABLE IF NOT EXISTS public.spl_token_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    logo_uri TEXT,
    coingecko_id TEXT,
    verified BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    daily_volume DECIMAL(20,2),
    freeze_authority TEXT,
    mint_authority TEXT,
    supply DECIMAL(30,0),
    source TEXT NOT NULL DEFAULT 'jupiter',
    metadata JSONB DEFAULT '{}',
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SPL TOKEN PRICES (Real-time pricing)
CREATE TABLE IF NOT EXISTS public.spl_token_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT NOT NULL,
    price_usd DECIMAL(20,8) NOT NULL,
    price_sol DECIMAL(20,8),
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    change_1h DECIMAL(10,6),
    change_24h DECIMAL(10,6),
    change_7d DECIMAL(10,6),
    last_trade_at TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'jupiter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mint_address, created_at)
);

-- SOLANA TRANSACTION STREAM (WebSocket captured data)
CREATE TABLE IF NOT EXISTS public.solana_transaction_stream (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signature TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    block_time BIGINT,
    slot BIGINT,
    transaction_type TEXT DEFAULT 'unknown',
    amount DECIMAL(25,8),
    token_mint TEXT,
    token_amount DECIMAL(25,8),
    from_address TEXT,
    to_address TEXT,
    fee DECIMAL(25,8),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    raw_transaction JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (transaction_type IN ('transfer', 'swap', 'stake', 'unstake', 'nft', 'unknown'))
);

-- PENDING TRANSFER LINKS (Auto-link AI queue)
CREATE TABLE IF NOT EXISTS public.pending_transfer_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signature TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount DECIMAL(25,8) NOT NULL,
    token_mint TEXT,
    transfer_type TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    auto_link_status TEXT DEFAULT 'pending',
    linked_user_id UUID,
    linked_wallet_id UUID,
    linked_transaction_id UUID,
    time_window_hours INTEGER DEFAULT 24,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (transfer_type IN ('incoming', 'outgoing')),
    CHECK (auto_link_status IN ('pending', 'linked', 'ignored', 'manual_review'))
);

-- AUTO-LINK TRANSFERS (Main auto-link table)
CREATE TABLE IF NOT EXISTS public.auto_link_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    wallet_address TEXT NOT NULL,
    transaction_signature TEXT NOT NULL UNIQUE,
    from_address TEXT,
    to_address TEXT,
    amount DECIMAL(25,8) NOT NULL,
    token_mint TEXT,
    token_symbol TEXT DEFAULT 'SOL',
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending_review',
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    ai_reasoning TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    auto_approved BOOLEAN DEFAULT FALSE,
    manual_review_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'auto_approved', 'ignored')),
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    CHECK (amount > 0)
);

-- AUTO-LINK SETTINGS (User preferences)
CREATE TABLE IF NOT EXISTS public.auto_link_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    wallet_id UUID,
    enabled BOOLEAN DEFAULT TRUE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.85,
    auto_approve_threshold DECIMAL(3,2) DEFAULT 0.95,
    max_amount_threshold DECIMAL(25,8),
    min_confidence_score DECIMAL(3,2) DEFAULT 0.8,
    time_window_hours INTEGER DEFAULT 6,
    notification_enabled BOOLEAN DEFAULT TRUE,
    auto_confirm_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, wallet_id)
);

-- WALLET ADDRESSES (Required by tests and Solana integration)
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'mainnet',
    is_active BOOLEAN DEFAULT TRUE,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, address, network)
);

-- SOLANA NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.solana_notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon_url TEXT,
    action_url_template TEXT,
    priority TEXT DEFAULT 'normal',
    requires_confirmation BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- SOLANA NOTIFICATION QUEUE
CREATE TABLE IF NOT EXISTS public.solana_notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    template_id UUID,
    signature TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Foreign keys for auto_link_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auto_link_settings_user_id_fkey'
    ) THEN
        ALTER TABLE public.auto_link_settings 
        ADD CONSTRAINT auto_link_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'auto_link_settings_wallet_id_fkey'
        ) THEN
            ALTER TABLE public.auto_link_settings 
            ADD CONSTRAINT auto_link_settings_wallet_id_fkey 
            FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Foreign keys for auto_link_transfers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auto_link_transfers_user_id_fkey'
    ) THEN
        ALTER TABLE public.auto_link_transfers 
        ADD CONSTRAINT auto_link_transfers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auto_link_transfers_token_mint_fkey'
    ) THEN
        ALTER TABLE public.auto_link_transfers 
        ADD CONSTRAINT auto_link_transfers_token_mint_fkey 
        FOREIGN KEY (token_mint) REFERENCES public.spl_token_cache(mint_address) ON DELETE SET NULL;
    END IF;
END $$;

-- Foreign keys for pending_transfer_links
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pending_transfer_links_user_id_fkey'
    ) THEN
        ALTER TABLE public.pending_transfer_links 
        ADD CONSTRAINT pending_transfer_links_user_id_fkey 
        FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'pending_transfer_links_wallet_id_fkey'
        ) THEN
            ALTER TABLE public.pending_transfer_links 
            ADD CONSTRAINT pending_transfer_links_wallet_id_fkey 
            FOREIGN KEY (linked_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;
        END IF;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pending_transfer_links_token_mint_fkey'
    ) THEN
        ALTER TABLE public.pending_transfer_links 
        ADD CONSTRAINT pending_transfer_links_token_mint_fkey 
        FOREIGN KEY (token_mint) REFERENCES public.spl_token_cache(mint_address) ON DELETE SET NULL;
    END IF;
END $$;

-- Foreign keys for solana_notification_queue
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'solana_notification_queue_user_id_fkey'
    ) THEN
        ALTER TABLE public.solana_notification_queue 
        ADD CONSTRAINT solana_notification_queue_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'solana_notification_queue_template_id_fkey'
    ) THEN
        ALTER TABLE public.solana_notification_queue 
        ADD CONSTRAINT solana_notification_queue_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES public.solana_notification_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Foreign keys for SPL token prices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'spl_token_prices_mint_address_fkey'
    ) THEN
        ALTER TABLE public.spl_token_prices 
        ADD CONSTRAINT spl_token_prices_mint_address_fkey 
        FOREIGN KEY (mint_address) REFERENCES public.spl_token_cache(mint_address) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_mint_address ON public.spl_token_cache(mint_address);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_symbol ON public.spl_token_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_verified ON public.spl_token_cache(verified);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_updated ON public.spl_token_cache(last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_mint_address ON public.spl_token_prices(mint_address);
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_created_at ON public.spl_token_prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_price_usd ON public.spl_token_prices(price_usd);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_signature ON public.solana_transaction_stream(signature);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_wallet ON public.solana_transaction_stream(wallet_address);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_block_time ON public.solana_transaction_stream(block_time DESC);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_type ON public.solana_transaction_stream(transaction_type);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_token_mint ON public.solana_transaction_stream(token_mint);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_signature ON public.pending_transfer_links(signature);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_wallet ON public.pending_transfer_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_status ON public.pending_transfer_links(auto_link_status);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_expires ON public.pending_transfer_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_confidence ON public.pending_transfer_links(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_user_id ON public.auto_link_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_wallet_address ON public.auto_link_transfers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_signature ON public.auto_link_transfers(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_status ON public.auto_link_transfers(status);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_confidence ON public.auto_link_transfers(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_auto_link_transfers_detected_at ON public.auto_link_transfers(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_user_id ON public.auto_link_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_enabled ON public.auto_link_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_user_id ON public.solana_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_status ON public.solana_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_created ON public.solana_notification_queue(created_at DESC);

-- Enable RLS on non-wallet tables
ALTER TABLE public.spl_token_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spl_token_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_transaction_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_transfer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_link_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_link_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for caches and queues (service/auth)
DROP POLICY IF EXISTS "authenticated_read_spl_token_cache" ON public.spl_token_cache;
CREATE POLICY "authenticated_read_spl_token_cache" ON public.spl_token_cache
    FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "service_role_manage_spl_token_cache" ON public.spl_token_cache
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "authenticated_read_spl_token_prices" ON public.spl_token_prices;
CREATE POLICY "authenticated_read_spl_token_prices" ON public.spl_token_prices
    FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "service_role_manage_spl_token_prices" ON public.spl_token_prices
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "users_read_own_transactions" ON public.solana_transaction_stream;
CREATE POLICY "users_read_own_transactions" ON public.solana_transaction_stream
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.wallets 
            WHERE public_key = solana_transaction_stream.wallet_address 
            AND user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.wallet_addresses
            WHERE address = solana_transaction_stream.wallet_address
            AND user_id = auth.uid()
        )
    );
CREATE POLICY IF NOT EXISTS "service_role_manage_transactions" ON public.solana_transaction_stream
    FOR ALL TO service_role USING (true);

CREATE POLICY IF NOT EXISTS "users_read_own_pending_links" ON public.pending_transfer_links
    FOR SELECT TO authenticated
    USING (
        linked_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.wallets 
            WHERE public_key = pending_transfer_links.wallet_address 
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.wallet_addresses
            WHERE address = pending_transfer_links.wallet_address
            AND user_id = auth.uid()
        )
    );
CREATE POLICY IF NOT EXISTS "service_role_manage_pending_links" ON public.pending_transfer_links
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "users_manage_own_auto_link_settings" ON public.auto_link_settings;
CREATE POLICY "users_manage_own_auto_link_settings" ON public.auto_link_settings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "users_read_own_auto_link_transfers" ON public.auto_link_transfers
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "service_role_manage_auto_link_transfers" ON public.auto_link_transfers
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "authenticated_read_notification_templates" ON public.solana_notification_templates;
CREATE POLICY "authenticated_read_notification_templates" ON public.solana_notification_templates
    FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY IF NOT EXISTS "service_role_manage_notification_templates" ON public.solana_notification_templates
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "users_read_own_notifications" ON public.solana_notification_queue;
CREATE POLICY "users_read_own_notifications" ON public.solana_notification_queue
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "service_role_manage_notification_queue" ON public.solana_notification_queue
    FOR ALL TO service_role USING (true);

-- Insert baseline notification templates
INSERT INTO public.solana_notification_templates (event_type, title_template, body_template, priority) VALUES
    ('solana_received', '💰 SOL Received', 'You received {{amount}} SOL from {{from_address}}', 'normal'),
    ('solana_sent', '📤 SOL Sent', 'You sent {{amount}} SOL to {{to_address}}', 'normal'),
    ('spl_received', '🪙 {{token_symbol}} Received', 'You received {{amount}} {{token_symbol}} tokens', 'normal'),
    ('spl_sent', '📤 {{token_symbol}} Sent', 'You sent {{amount}} {{token_symbol}} tokens', 'normal'),
    ('auto_link_success', '✅ Transaction Linked', 'Transaction automatically linked to your wallet', 'low'),
    ('auto_link_failed', '❓ Transaction Needs Review', 'A transaction requires manual review and linking', 'normal'),
    ('auto_link_high_confidence', '🎯 High Confidence Link', 'Transaction matched with {{confidence}}% confidence', 'normal'),
    ('wallet_activity_spike', '🔥 High Activity Detected', 'Unusual activity detected on your wallet', 'high')
ON CONFLICT (event_type) DO NOTHING;

-- Utility functions
CREATE OR REPLACE FUNCTION public.get_spl_token_info(mint_addr TEXT)
RETURNS TABLE (
    mint_address TEXT,
    symbol TEXT,
    name TEXT,
    decimals INTEGER,
    logo_uri TEXT,
    verified BOOLEAN,
    current_price_usd DECIMAL(20,8),
    volume_24h DECIMAL(20,2),
    change_24h DECIMAL(10,6)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stc.mint_address,
        stc.symbol,
        stc.name,
        stc.decimals,
        stc.logo_uri,
        stc.verified,
        stp.price_usd,
        stp.volume_24h,
        stp.change_24h
    FROM public.spl_token_cache stc
    LEFT JOIN LATERAL (
        SELECT price_usd, volume_24h, change_24h
        FROM public.spl_token_prices
        WHERE mint_address = stc.mint_address
        ORDER BY created_at DESC
        LIMIT 1
    ) stp ON true
    WHERE stc.mint_address = mint_addr;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_pending_auto_links(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    signature TEXT,
    wallet_address TEXT,
    amount DECIMAL(25,8),
    token_symbol TEXT,
    confidence_score DECIMAL(3,2),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ptl.id,
        ptl.signature,
        ptl.wallet_address,
        ptl.amount,
        COALESCE(stc.symbol, 'SOL') as token_symbol,
        ptl.confidence_score,
        ptl.expires_at,
        ptl.created_at
    FROM public.pending_transfer_links ptl
    LEFT JOIN public.spl_token_cache stc ON ptl.token_mint = stc.mint_address
    WHERE ptl.linked_user_id = p_user_id
      AND ptl.auto_link_status = 'pending'
      AND ptl.expires_at > NOW()
    ORDER BY ptl.confidence_score DESC, ptl.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_auto_link_status(
    p_link_id UUID,
    p_user_id UUID,
    p_new_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.pending_transfer_links
    SET 
        auto_link_status = p_new_status,
        last_attempt_at = NOW()
    WHERE id = p_link_id
      AND linked_user_id = p_user_id
      AND auto_link_status = 'pending';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_spl_token_info TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_auto_links TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_auto_link_status TO authenticated, service_role;

-- Realtime trigger for auto-link changes
CREATE OR REPLACE FUNCTION public.notify_auto_link_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'auto_link_changes',
        json_build_object(
            'operation', TG_OP,
            'record', NEW,
            'user_id', COALESCE(NEW.linked_user_id, OLD.linked_user_id)
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_link_changes_trigger ON public.pending_transfer_links;
CREATE TRIGGER auto_link_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.pending_transfer_links
    FOR EACH ROW EXECUTE FUNCTION public.notify_auto_link_change();

-- Data validation constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_confidence_score'
    ) THEN
        ALTER TABLE public.pending_transfer_links 
        ADD CONSTRAINT valid_confidence_score 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'positive_amount'
    ) THEN
        ALTER TABLE public.pending_transfer_links 
        ADD CONSTRAINT positive_amount 
        CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'positive_price'
    ) THEN
        ALTER TABLE public.spl_token_prices 
        ADD CONSTRAINT positive_price 
        CHECK (price_usd >= 0);
    END IF;
END $$;

-- Commit schema transaction
COMMIT;

-- Optional success notice (will be visible in psql clients)
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'spl_token_cache', 'spl_token_prices', 'solana_transaction_stream',
        'pending_transfer_links', 'auto_link_transfers', 'auto_link_settings', 
        'solana_notification_templates', 'solana_notification_queue'
    );
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%solana%' OR indexname LIKE 'idx_%spl%' OR indexname LIKE 'idx_%auto_link%';
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'spl_token_cache', 'spl_token_prices', 'solana_transaction_stream',
        'pending_transfer_links', 'auto_link_transfers', 'auto_link_settings', 
        'solana_notification_templates', 'solana_notification_queue'
    );
    RAISE NOTICE 'Tables: %, Indexes: %, Policies: %', table_count, index_count, policy_count;
END $$;

-- ============================================================================
-- STEP 2: OWNERSHIP RLS POLICIES (Content from COMPLETE_RLS_POLICIES.sql)
-- ============================================================================

ALTER TABLE public.pending_transfer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can see pending links for their wallets" ON public.pending_transfer_links
    FOR SELECT TO authenticated
    USING (
        wallet_address IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
        OR linked_user_id = auth.uid()
    );
CREATE POLICY IF NOT EXISTS "Users can update their pending links" ON public.pending_transfer_links
    FOR UPDATE TO authenticated
    USING (
        wallet_address IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
        OR linked_user_id = auth.uid()
    )
    WITH CHECK (
        wallet_address IN (SELECT public_key FROM public.wallets WHERE user_id = auth.uid())
        OR linked_user_id = auth.uid()
    );
CREATE POLICY IF NOT EXISTS "System can insert pending links" ON public.pending_transfer_links
    FOR INSERT TO authenticated
    WITH CHECK (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage own profile" ON public.user_profiles
    FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Admins can view all profiles" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage own wallets" ON public.wallets
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own transactions" ON public.transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can create own transactions" ON public.transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own transactions" ON public.transactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.solana_notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can see their notification queue" ON public.solana_notification_queue
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their notifications" ON public.solana_notification_queue
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: VALIDATOR FUNCTION AND REPORT (Content from validate-launch-readiness.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_celora_database()
RETURNS TABLE (
    category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'wallets', 'user_profiles', 'transactions', 
        'spl_token_cache', 'spl_token_prices', 
        'pending_transfer_links', 'auto_link_transfers',
        'solana_notification_queue', 'solana_notification_templates'
    );
    RETURN QUERY SELECT 'TABLES','Core Tables Present', CASE WHEN table_count >= 8 THEN '✅ PASS' ELSE '❌ FAIL' END, format('%s/9 required tables found', table_count);

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        RETURN QUERY SELECT 'TABLES','Wallets Table Structure','✅ PASS','Master wallets table exists with proper schema';
    ELSE
        RETURN QUERY SELECT 'TABLES','Wallets Table Structure','❌ FAIL','Master wallets table missing - deploy production-deployment.sql';
    END IF;

    SELECT COUNT(*) INTO policy_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true AND tablename IN ('wallets','transactions','pending_transfer_links');
    RETURN QUERY SELECT 'SECURITY','RLS Enabled on Core Tables', CASE WHEN policy_count >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END, format('%s/3 core tables have RLS enabled', policy_count);

    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallets' AND policyname LIKE '%own%';
    RETURN QUERY SELECT 'SECURITY','Wallet Ownership Policies', CASE WHEN policy_count >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END, format('%s ownership policies found for wallets', policy_count);

    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' AND tablename IN ('wallets','spl_token_cache','pending_transfer_links');
    RETURN QUERY SELECT 'PERFORMANCE','Database Indexes', CASE WHEN index_count >= 10 THEN '✅ PASS' ELSE '⚠️ WARN' END, format('%s performance indexes created', index_count);

    SELECT COUNT(*) INTO function_count FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('get_spl_token_info','get_pending_auto_links','update_auto_link_status');
    RETURN QUERY SELECT 'FUNCTIONS','Utility Functions', CASE WHEN function_count >= 3 THEN '✅ PASS' ELSE '⚠️ WARN' END, format('%s/3 utility functions found', function_count);

    SELECT COUNT(*) INTO constraint_count FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY' AND table_name IN ('wallets','auto_link_settings','pending_transfer_links');
    RETURN QUERY SELECT 'DATA_INTEGRITY','Foreign Key Constraints', CASE WHEN constraint_count >= 3 THEN '✅ PASS' ELSE '⚠️ WARN' END, format('%s foreign key constraints enforced', constraint_count);

    SELECT COUNT(*) INTO table_count FROM public.solana_notification_templates WHERE is_active = true;
    RETURN QUERY SELECT 'DATA','Notification Templates', CASE WHEN table_count >= 5 THEN '✅ PASS' ELSE '⚠️ WARN' END, format('%s notification templates loaded', table_count);

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RETURN QUERY SELECT 'EXTENSIONS','UUID Extension','✅ PASS','uuid-ossp extension is available';
    ELSE
        RETURN QUERY SELECT 'EXTENSIONS','UUID Extension','❌ FAIL','uuid-ossp extension missing - required for UUID generation';
    END IF;

    DECLARE total_checks INTEGER := 8; passed_checks INTEGER; BEGIN
        SELECT COUNT(*) INTO passed_checks FROM (
            SELECT 1 WHERE table_count >= 8
            UNION ALL SELECT 1 WHERE policy_count >= 1
            UNION ALL SELECT 1 WHERE index_count >= 10
            UNION ALL SELECT 1 WHERE function_count >= 3
            UNION ALL SELECT 1 WHERE constraint_count >= 3
        ) AS checks;
        RETURN QUERY SELECT 'SUMMARY','Database Launch Readiness',
            CASE WHEN passed_checks >= 6 THEN '🚀 READY FOR LAUNCH' WHEN passed_checks >= 4 THEN '⚠️ NEEDS MINOR FIXES' ELSE '❌ CRITICAL ISSUES' END,
            format('Passed %s/%s critical checks', passed_checks, total_checks);
    END;
END;
$$ LANGUAGE plpgsql;

-- REPORTS
SELECT '🔍 CELORA DATABASE VALIDATION REPORT' as title, '=================================' as separator;
SELECT * FROM validate_celora_database() ORDER BY category, check_name;

SELECT '📊 DETAILED TABLE ANALYSIS' as section, '=========================' as separator;
SELECT 
    schemaname, tablename,
    CASE WHEN n_tup_ins IS NOT NULL THEN n_tup_ins::TEXT || ' rows' ELSE 'No data' END as row_count,
    CASE WHEN pg_total_relation_size(schemaname||'.'||tablename) > 0 THEN pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) ELSE '0 bytes' END as table_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
AND tablename IN ('wallets','spl_token_cache','pending_transfer_links','auto_link_transfers','solana_notification_queue')
ORDER BY tablename;

SELECT '🔒 RLS POLICY SUMMARY' as section, '===================' as separator;
SELECT tablename, policyname, cmd as operation,
    CASE WHEN qual IS NOT NULL THEN 'RESTRICTED' ELSE 'OPEN' END as access_level
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

SELECT '⚡ PERFORMANCE INDEX ANALYSIS' as section, '==============================' as separator;
SELECT schemaname, tablename, indexname,
    CASE WHEN indisunique THEN 'UNIQUE' ELSE 'STANDARD' END as index_type
FROM pg_indexes JOIN pg_index ON pg_indexes.indexname = pg_class.relname
JOIN pg_class ON pg_index.indexrelid = pg_class.oid
WHERE schemaname = 'public' AND tablename IN ('wallets','spl_token_cache','pending_transfer_links')
ORDER BY tablename, indexname;

SELECT '🚀 LAUNCH READINESS SUMMARY' as section, '===========================' as separator;
WITH validation_summary AS (
    SELECT category, COUNT(*) as total_checks,
           COUNT(CASE WHEN status LIKE '✅%' THEN 1 END) as passed_checks,
           COUNT(CASE WHEN status LIKE '⚠️%' THEN 1 END) as warning_checks,
           COUNT(CASE WHEN status LIKE '❌%' THEN 1 END) as failed_checks
    FROM validate_celora_database() GROUP BY category
)
SELECT category, total_checks, passed_checks, warning_checks, failed_checks,
       ROUND((passed_checks::DECIMAL / total_checks) * 100, 1) || '%' as success_rate
FROM validation_summary ORDER BY category;

SELECT '🎯 FINAL RECOMMENDATION' as section, '======================' as separator;
WITH overall_status AS (
    SELECT COUNT(CASE WHEN status LIKE '✅%' THEN 1 END) as total_passed,
           COUNT(*) as total_checks
    FROM validate_celora_database()
)
SELECT CASE 
        WHEN (total_passed::DECIMAL / total_checks) >= 0.8 THEN '🚀 DATABASE IS READY FOR LAUNCH!'
        WHEN (total_passed::DECIMAL / total_checks) >= 0.6 THEN '⚠️ MINOR FIXES NEEDED BEFORE LAUNCH'
        ELSE '❌ CRITICAL ISSUES MUST BE RESOLVED'
       END as recommendation,
       total_passed || '/' || total_checks || ' checks passed' as score,
       ROUND((total_passed::DECIMAL / total_checks) * 100, 1) || '%' as readiness_percentage
FROM overall_status;
