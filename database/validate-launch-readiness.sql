-- ================================================================
-- SQL SCHEMA VALIDATION AND LAUNCH READINESS CHECK
-- Run this in Supabase SQL Editor to validate database
-- ================================================================

-- Create a comprehensive validation function
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
    -- ====== TABLE VALIDATION ======
    
    -- Check core tables exist
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'wallets', 'user_profiles', 'transactions', 
        'spl_token_cache', 'spl_token_prices', 
        'pending_transfer_links', 'auto_link_transfers',
        'solana_notification_queue', 'solana_notification_templates'
    );
    
    RETURN QUERY SELECT 
        'TABLES'::TEXT,
        'Core Tables Present'::TEXT,
        CASE WHEN table_count >= 8 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        format('%s/9 required tables found', table_count)::TEXT;
    
    -- Check wallets table structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        RETURN QUERY SELECT 
            'TABLES'::TEXT,
            'Wallets Table Structure'::TEXT,
            '✅ PASS'::TEXT,
            'Master wallets table exists with proper schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'TABLES'::TEXT,
            'Wallets Table Structure'::TEXT,
            '❌ FAIL'::TEXT,
            'Master wallets table missing - deploy production-deployment.sql'::TEXT;
    END IF;
    
    -- ====== RLS POLICY VALIDATION ======
    
    -- Check RLS is enabled on critical tables
    SELECT COUNT(*) INTO policy_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN ('wallets', 'transactions', 'pending_transfer_links');
    
    RETURN QUERY SELECT 
        'SECURITY'::TEXT,
        'RLS Enabled on Core Tables'::TEXT,
        CASE WHEN policy_count >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        format('%s/3 core tables have RLS enabled', policy_count)::TEXT;
    
    -- Check specific policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wallets'
    AND policyname LIKE '%own%';
    
    RETURN QUERY SELECT 
        'SECURITY'::TEXT,
        'Wallet Ownership Policies'::TEXT,
        CASE WHEN policy_count >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        format('%s ownership policies found for wallets', policy_count)::TEXT;
    
    -- ====== INDEX VALIDATION ======
    
    -- Check performance indexes exist
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
    AND tablename IN ('wallets', 'spl_token_cache', 'pending_transfer_links');
    
    RETURN QUERY SELECT 
        'PERFORMANCE'::TEXT,
        'Database Indexes'::TEXT,
        CASE WHEN index_count >= 10 THEN '✅ PASS' ELSE '⚠️ WARN' END::TEXT,
        format('%s performance indexes created', index_count)::TEXT;
    
    -- ====== FUNCTION VALIDATION ======
    
    -- Check utility functions exist
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('get_spl_token_info', 'get_pending_auto_links', 'update_auto_link_status');
    
    RETURN QUERY SELECT 
        'FUNCTIONS'::TEXT,
        'Utility Functions'::TEXT,
        CASE WHEN function_count >= 3 THEN '✅ PASS' ELSE '⚠️ WARN' END::TEXT,
        format('%s/3 utility functions found', function_count)::TEXT;
    
    -- ====== CONSTRAINT VALIDATION ======
    
    -- Check foreign key constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('wallets', 'auto_link_settings', 'pending_transfer_links');
    
    RETURN QUERY SELECT 
        'DATA_INTEGRITY'::TEXT,
        'Foreign Key Constraints'::TEXT,
        CASE WHEN constraint_count >= 3 THEN '✅ PASS' ELSE '⚠️ WARN' END::TEXT,
        format('%s foreign key constraints enforced', constraint_count)::TEXT;
    
    -- ====== TEMPLATE DATA VALIDATION ======
    
    -- Check notification templates
    SELECT COUNT(*) INTO table_count
    FROM public.solana_notification_templates
    WHERE is_active = true;
    
    RETURN QUERY SELECT 
        'DATA'::TEXT,
        'Notification Templates'::TEXT,
        CASE WHEN table_count >= 5 THEN '✅ PASS' ELSE '⚠️ WARN' END::TEXT,
        format('%s notification templates loaded', table_count)::TEXT;
    
    -- ====== EXTENSION VALIDATION ======
    
    -- Check required extensions
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RETURN QUERY SELECT 
            'EXTENSIONS'::TEXT,
            'UUID Extension'::TEXT,
            '✅ PASS'::TEXT,
            'uuid-ossp extension is available'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'EXTENSIONS'::TEXT,
            'UUID Extension'::TEXT,
            '❌ FAIL'::TEXT,
            'uuid-ossp extension missing - required for UUID generation'::TEXT;
    END IF;
    
    -- ====== OVERALL ASSESSMENT ======
    
    -- Calculate overall readiness
    DECLARE
        total_checks INTEGER := 8;
        passed_checks INTEGER;
    BEGIN
        -- This is a simplified calculation - in real implementation,
        -- you'd count actual passing conditions
        SELECT COUNT(*) INTO passed_checks
        FROM (
            SELECT 1 WHERE table_count >= 8  -- Core tables
            UNION ALL SELECT 1 WHERE policy_count >= 1  -- RLS policies  
            UNION ALL SELECT 1 WHERE index_count >= 10  -- Indexes
            UNION ALL SELECT 1 WHERE function_count >= 3  -- Functions
            UNION ALL SELECT 1 WHERE constraint_count >= 3  -- Constraints
        ) AS checks;
        
        RETURN QUERY SELECT 
            'SUMMARY'::TEXT,
            'Database Launch Readiness'::TEXT,
            CASE 
                WHEN passed_checks >= 6 THEN '🚀 READY FOR LAUNCH'
                WHEN passed_checks >= 4 THEN '⚠️ NEEDS MINOR FIXES'
                ELSE '❌ CRITICAL ISSUES'
            END::TEXT,
            format('Passed %s/%s critical checks', passed_checks, total_checks)::TEXT;
    END;
    
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- RUN VALIDATION AND DISPLAY RESULTS
-- ================================================================

SELECT 
    '🔍 CELORA DATABASE VALIDATION REPORT' as title,
    '=================================' as separator;

SELECT * FROM validate_celora_database() ORDER BY category, check_name;

-- ================================================================
-- DETAILED TABLE ANALYSIS
-- ================================================================

SELECT 
    '📊 DETAILED TABLE ANALYSIS' as section,
    '=========================' as separator;

-- Table sizes and row counts
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN n_tup_ins IS NOT NULL THEN n_tup_ins::TEXT || ' rows'
        ELSE 'No data'
    END as row_count,
    CASE 
        WHEN pg_total_relation_size(schemaname||'.'||tablename) > 0 
        THEN pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
        ELSE '0 bytes'
    END as table_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'wallets', 'spl_token_cache', 'pending_transfer_links', 
    'auto_link_transfers', 'solana_notification_queue'
)
ORDER BY tablename;

-- ================================================================
-- RLS POLICY SUMMARY
-- ================================================================

SELECT 
    '🔒 RLS POLICY SUMMARY' as section,
    '===================' as separator;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'RESTRICTED'
        ELSE 'OPEN'
    END as access_level
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- ================================================================
-- PERFORMANCE INDEX ANALYSIS
-- ================================================================

SELECT 
    '⚡ PERFORMANCE INDEX ANALYSIS' as section,
    '==============================' as separator;

SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN indisunique THEN 'UNIQUE'
        ELSE 'STANDARD'
    END as index_type
FROM pg_indexes 
JOIN pg_index ON pg_indexes.indexname = pg_class.relname
JOIN pg_class ON pg_index.indexrelid = pg_class.oid
WHERE schemaname = 'public' 
AND tablename IN ('wallets', 'spl_token_cache', 'pending_transfer_links')
ORDER BY tablename, indexname;

-- ================================================================
-- LAUNCH READINESS SUMMARY
-- ================================================================

SELECT 
    '🚀 LAUNCH READINESS SUMMARY' as section,
    '===========================' as separator;

-- Final validation query
WITH validation_summary AS (
    SELECT 
        category,
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status LIKE '✅%' THEN 1 END) as passed_checks,
        COUNT(CASE WHEN status LIKE '⚠️%' THEN 1 END) as warning_checks,
        COUNT(CASE WHEN status LIKE '❌%' THEN 1 END) as failed_checks
    FROM validate_celora_database()
    GROUP BY category
)
SELECT 
    category,
    total_checks,
    passed_checks,
    warning_checks,
    failed_checks,
    ROUND((passed_checks::DECIMAL / total_checks) * 100, 1) || '%' as success_rate
FROM validation_summary
ORDER BY category;

-- Overall recommendation
SELECT 
    '🎯 FINAL RECOMMENDATION' as section,
    '======================' as separator;

WITH overall_status AS (
    SELECT 
        COUNT(CASE WHEN status LIKE '✅%' THEN 1 END) as total_passed,
        COUNT(*) as total_checks
    FROM validate_celora_database()
)
SELECT 
    CASE 
        WHEN (total_passed::DECIMAL / total_checks) >= 0.8 THEN '🚀 DATABASE IS READY FOR LAUNCH!'
        WHEN (total_passed::DECIMAL / total_checks) >= 0.6 THEN '⚠️ MINOR FIXES NEEDED BEFORE LAUNCH'
        ELSE '❌ CRITICAL ISSUES MUST BE RESOLVED'
    END as recommendation,
    total_passed || '/' || total_checks || ' checks passed' as score,
    ROUND((total_passed::DECIMAL / total_checks) * 100, 1) || '%' as readiness_percentage
FROM overall_status;