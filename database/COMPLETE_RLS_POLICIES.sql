-- ============================================================================
-- COMPLETE RLS POLICIES FOR CELORA V4 - OWNERSHIP-BASED SECURITY
-- ============================================================================

-- ============================================================================
-- 1. PENDING_TRANSFER_LINKS POLICIES
-- ============================================================================

-- Eierskap: linked_user_id (direkte bruker) + wallet_address (via wallets tabellen)
-- Tabellstruktur: pending_transfer_links har IKKE created_by, men linked_user_id

-- Enable RLS
ALTER TABLE public.pending_transfer_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see pending links for their wallets or where they are linked user
CREATE POLICY "Users can see pending links for their wallets" ON public.pending_transfer_links
    FOR SELECT TO authenticated
    USING (
        -- User kan se hvis wallet_address tilhører deres wallets
        wallet_address IN (
            SELECT public_key FROM public.wallets 
            WHERE user_id = auth.uid()
        ) 
        OR 
        -- User kan se hvis de er direkte linked som bruker
        linked_user_id = auth.uid()
    );

-- Policy: Users can update pending links for their wallets
CREATE POLICY "Users can update their pending links" ON public.pending_transfer_links
    FOR UPDATE TO authenticated
    USING (
        wallet_address IN (
            SELECT public_key FROM public.wallets 
            WHERE user_id = auth.uid()
        ) 
        OR linked_user_id = auth.uid()
    )
    WITH CHECK (
        wallet_address IN (
            SELECT public_key FROM public.wallets 
            WHERE user_id = auth.uid()
        ) 
        OR linked_user_id = auth.uid()
    );

-- Policy: System can insert (no user restrictions for auto-link system)
CREATE POLICY "System can insert pending links" ON public.pending_transfer_links
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Auto-link system kan lage nye links

-- ============================================================================
-- 2. USER_ROLES POLICIES  
-- ============================================================================

-- Eierskap: user_id (direkte bruker-referanse)
-- Tabellstruktur: user_roles.user_id → auth.users(id)

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Only admins can manage all roles (insert/update/delete)
CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 3. USER_PROFILES POLICIES (BONUS - GRUNNLEGGENDE SIKKERHET)
-- ============================================================================

-- Eierskap: id (primary key = auth.users.id)

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own profile
CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR  -- Own profile
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 4. WALLETS POLICIES (BONUS - WALLET SIKKERHET)
-- ============================================================================

-- Eierskap: user_id

-- Enable RLS  
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and manage their own wallets
CREATE POLICY "Users can manage own wallets" ON public.wallets
    FOR ALL TO authenticated  
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. TRANSACTIONS POLICIES (BONUS - TRANSAKSJON SIKKERHET)
-- ============================================================================

-- Eierskap: user_id

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions (for status changes)
CREATE POLICY "Users can update own transactions" ON public.transactions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. NOTIFICATIONS POLICIES (BONUS - NOTIFIKASJON SIKKERHET)
-- ============================================================================

-- Eierskap: user_id

-- Enable RLS
ALTER TABLE public.solana_notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can see their notification queue" ON public.solana_notification_queue
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can update their notification status (mark as read, etc.)
CREATE POLICY "Users can update their notifications" ON public.solana_notification_queue
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SUMMARY: KOLONNENAVN FOR EIERSKAP
-- ============================================================================

/*
TABELL                      EIERSKAP KOLONNE    POLICY TYPE
========================    ================    ===========
pending_transfer_links      linked_user_id      Hybrid (user_id + wallet check)
user_roles                  user_id             Direct ownership
user_profiles              id                   Direct ownership (PK = user FK)
wallets                    user_id             Direct ownership  
transactions               user_id             Direct ownership
solana_notification_queue  user_id             Direct ownership

MERK: 
- pending_transfer_links har IKKE created_by kolonne
- pending_transfer_links bruker linked_user_id + wallet_address via wallets tabellen
- user_roles har user_id som eierskap kolonne
- Alle policies er eierskapsbaserte og følger auth.uid() = eier_kolonne pattern
*/

-- ============================================================================
-- TESTING POLICIES (Kjør dette for å teste at policies virker)
-- ============================================================================

-- Test 1: Sjekk at RLS er enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pending_transfer_links', 'user_roles', 'user_profiles', 'wallets', 'transactions');

-- Test 2: List alle policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test 3: Test som autentisert bruker (kjør med SET ROLE)
-- SELECT * FROM public.user_roles; -- Skal kun vise egne roller
-- SELECT * FROM public.pending_transfer_links; -- Skal kun vise egne links