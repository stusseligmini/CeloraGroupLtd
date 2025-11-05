-- ================================================================
-- CELORA WALLET EXTENSION - QUICK DATABASE SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- ================================================================

-- ================================================================
-- STEP 1: CREATE WALLETS TABLE (if not exists)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Wallet identification
    wallet_name TEXT NOT NULL DEFAULT 'My Wallet',
    wallet_type TEXT NOT NULL DEFAULT 'solana',
    
    -- Crypto wallet fields (for extension)
    public_key TEXT,
    encrypted_private_key TEXT,
    network TEXT NOT NULL DEFAULT 'devnet',
    
    -- Balance tracking
    currency TEXT NOT NULL DEFAULT 'SOL',
    balance DECIMAL(25,8) DEFAULT 0.00000000,
    
    -- Wallet properties
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- STEP 2: CREATE TRANSACTIONS TABLE (if not exists)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction details
    amount DECIMAL(25,8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SOL',
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('send', 'receive', 'stake', 'unstake', 'swap')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Optional metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- STEP 3: CREATE INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON public.wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_wallets_is_primary ON public.wallets(is_primary);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- ================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 5: CREATE RLS POLICIES FOR WALLETS
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;

-- Create new policies
CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON public.wallets
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON public.wallets
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets" ON public.wallets
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- ================================================================
-- STEP 6: CREATE RLS POLICIES FOR TRANSACTIONS
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

-- Create new policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- STEP 7: CREATE UPDATED_AT TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for wallets
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- STEP 8: VERIFY SETUP
-- ================================================================

-- Check if tables exist
SELECT 
    'wallets' as table_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'wallets'
UNION ALL
SELECT 
    'transactions' as table_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'transactions';

-- ================================================================
-- SUCCESS! Extension database is ready!
-- ================================================================
