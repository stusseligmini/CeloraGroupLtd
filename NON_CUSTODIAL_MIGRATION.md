# Non-Custodial Wallet Migration Guide

## Overview

Celora has been rebuilt from a **custodial** wallet to a **non-custodial** wallet system. This means:

- **Private keys are NEVER stored on the server**
- **Private keys are generated and encrypted client-side with user passwords**
- **All transactions are signed client-side before submission**
- **Server only stores public keys and addresses**

## Key Changes

### 1. Database Schema

**Removed:**
- `encryptedPrivateKey` - Private keys are no longer stored on server
- `encryptedMnemonic` - Mnemonics are no longer stored on server

**Added:**
- `mnemonicHash` - SHA-256 hash of mnemonic for recovery verification only

**Migration SQL:**
```sql
-- Remove encrypted private key fields
ALTER TABLE wallets DROP COLUMN encrypted_private_key;
ALTER TABLE wallets DROP COLUMN encrypted_mnemonic;

-- Add mnemonic hash field
ALTER TABLE wallets ADD COLUMN mnemonic_hash VARCHAR(64);
CREATE INDEX wallets_mnemonic_hash_idx ON wallets(mnemonic_hash);
```

### 2. Client-Side Wallet Library

**New file:** `src/lib/wallet/nonCustodialWallet.ts`

Features:
- Generate mnemonic phrases (12 or 24 words)
- Derive wallet keys for multiple blockchains
- Client-side encryption with user passwords (Web Crypto API)
- Local storage utilities for encrypted wallets

**Usage:**
```typescript
import { generateMnemonicPhrase, deriveWallet, WalletEncryption } from '@/lib/wallet/nonCustodialWallet';

// Generate new wallet
const mnemonic = generateMnemonicPhrase(12);
const wallet = deriveWallet(mnemonic, 'ethereum');

// Encrypt with user password
const encrypted = await WalletEncryption.encrypt(mnemonic, userPassword);

// Store locally
await storeWalletLocally(walletId, encrypted.encrypted, encrypted.salt, encrypted.iv);
```

### 3. Client-Side Transaction Signing

**New file:** `src/lib/wallet/transactionSigning.ts`

Features:
- Sign EVM transactions (Ethereum, Celo, Polygon, Arbitrum, Optimism)
- Sign Solana transactions
- Sign Bitcoin transactions

**Usage:**
```typescript
import { signEVMTransaction } from '@/lib/wallet/transactionSigning';

// Sign transaction client-side
const signed = signEVMTransaction(privateKey, {
  to: recipientAddress,
  value: amount,
  chainId: 1,
});

// Send signed transaction to server
await fetch('/api/wallet/send', {
  method: 'POST',
  body: JSON.stringify({
    walletId,
    signedTransaction: signed.signedTx,
  }),
});
```

### 4. Wallet Creation API

**Updated:** `src/app/api/wallet/create/route.ts`

**Before (Custodial):**
- Server generated keys
- Server encrypted and stored private keys

**After (Non-Custodial):**
- Client generates mnemonic and derives keys
- Client sends only public key and address
- Server stores only public information

**Request:**
```json
{
  "blockchain": "ethereum",
  "address": "0x...",
  "publicKey": "0x...",
  "mnemonicHash": "sha256_hash",
  "label": "My Wallet",
  "isDefault": false
}
```

### 5. Transaction APIs

**Updated:** `src/app/api/swap/route.ts`

**Before:**
- Server received private key (encrypted)
- Server signed transactions

**After:**
- Client signs transactions
- Server receives signed transaction
- Server broadcasts signed transaction

**Request:**
```json
{
  "walletId": "...",
  "blockchain": "ethereum",
  "signedTransaction": "0x...",
  "fromToken": "0x...",
  "toToken": "0x...",
  "amount": "1000000000000000000"
}
```

### 6. Validation Schemas

**Updated:** `src/lib/validation/schemas.ts`

**WalletCreateRequestSchema:**
- Removed: `encryptedMnemonic`
- Added: `address`, `publicKey`, `mnemonicHash` (optional)

**SwapExecuteRequestSchema:**
- Removed: `privateKey`
- Added: `signedTransaction` (required)

## Migration Steps

### Step 1: Run Database Migration

```bash
# Create migration
npm run db:migrate -- --name remove_custodial_fields

# Or manually run SQL:
psql $DATABASE_URL < prisma/migrations/remove_custodial_fields/migration.sql
```

### Step 2: Update Frontend Code

1. **Install dependencies:**
```bash
npm install bip39 @scure/bip32 @scure/bip39 @noble/hashes
```

2. **Update wallet creation:**
   - Generate mnemonic client-side
   - Derive wallet keys client-side
   - Encrypt mnemonic with user password
   - Send only public keys to server

3. **Update transaction signing:**
   - Sign all transactions client-side
   - Send signed transactions to server

### Step 3: Update Swap Service

**File:** `src/server/services/swapService.ts`

Add new methods:
- `broadcastSigned1InchSwap()` - Broadcast pre-signed EVM transaction
- `broadcastSignedJupiterSwap()` - Broadcast pre-signed Solana transaction

### Step 4: Update All Transaction Endpoints

Find and update all endpoints that sign transactions:
- `/api/wallet/send` - Update to accept signed transactions
- `/api/staking` - Update if it signs transactions
- Any other transaction endpoints

### Step 5: Update Browser Extension

**File:** `extension/background/service-worker.js`

- Store encrypted wallets locally using `chrome.storage.local`
- Sign transactions locally in extension
- Never send private keys to main app

### Step 6: Update Mobile App

**Files:** `mobile/src/**/*`

- Use secure local storage (Keychain on iOS, Keystore on Android)
- Generate and encrypt wallets locally
- Sign all transactions locally

## Security Considerations

### ✅ What's Better Now:

1. **User Control**: Users fully control their private keys
2. **No Server Risk**: Private keys never touch the server
3. **Decentralization**: Aligns with crypto philosophy
4. **Compliance**: Better for regulatory compliance

### ⚠️ New Challenges:

1. **User Responsibility**: Users must backup their mnemonic
2. **Recovery**: Lost password = lost funds (no server recovery)
3. **UX Complexity**: More complex user experience
4. **Client Security**: Need secure client-side storage

### 🛡️ Best Practices:

1. **Force Mnemonic Backup**: Always show mnemonic during wallet creation
2. **Password Strength**: Enforce strong passwords
3. **Secure Storage**: Use platform secure storage (Keychain/Keystore)
4. **Session Management**: Clear private keys from memory after use
5. **Transaction Review**: Always show transaction details before signing

## Testing Checklist

- [ ] Wallet creation generates mnemonic client-side
- [ ] Wallet keys are derived correctly for all blockchains
- [ ] Mnemonic encryption/decryption works
- [ ] Transactions are signed correctly client-side
- [ ] Server accepts and broadcasts signed transactions
- [ ] No private keys are stored in database
- [ ] Browser extension stores wallets locally
- [ ] Mobile app uses secure storage
- [ ] Wallet recovery with mnemonic works
- [ ] All transaction types work (send, swap, stake)

## Rollback Plan

If issues arise:

1. **Database:** Previous schema backup available
2. **Code:** Git revert to previous commit
3. **Data:** Old encrypted keys can be restored (if backup exists)

**Note:** Once migrated, old encrypted keys in database are useless since we don't store the decryption keys anymore.

## Documentation Updates Needed

1. Update `CELORA-BLUEPRINT.md` - Change from custodial to non-custodial
2. Update `README.md` - Update architecture description
3. Update API docs - New request/response formats
4. Update user guide - New wallet creation flow
5. Update security docs - New security model

## Next Steps

1. Complete swap service update (add broadcast methods)
2. Find and update send transaction endpoint
3. Update browser extension
4. Update mobile app
5. Create wallet recovery flow
6. Update all documentation
7. Comprehensive testing
8. Gradual rollout with feature flag

