-- Migration: Remove custodial fields and add non-custodial support
-- Date: 2025-11-23
-- Description: Remove encrypted private keys and mnemonics from server.
--              Add mnemonic hash for recovery verification only.

-- Step 1: Add new mnemonic_hash column (nullable for migration)
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS mnemonic_hash VARCHAR(64);

-- Step 2: Create index on mnemonic_hash for faster lookups
CREATE INDEX IF NOT EXISTS wallets_mnemonic_hash_idx ON wallets(mnemonic_hash);

-- Step 3: Remove old encrypted fields (after data migration if needed)
-- WARNING: This permanently deletes encrypted private keys and mnemonics
-- Make sure to backup any existing data before running this migration
ALTER TABLE wallets 
DROP COLUMN IF EXISTS encrypted_private_key,
DROP COLUMN IF EXISTS encrypted_mnemonic;

-- Step 4: Add comment to schema for clarity
COMMENT ON COLUMN wallets.mnemonic_hash IS 'SHA-256 hash of mnemonic phrase for recovery verification only. Private keys are NEVER stored on server.';

-- Note: After migration, old wallets will need to be recreated with new non-custodial flow
-- Existing users should be notified to backup their mnemonics before migration

