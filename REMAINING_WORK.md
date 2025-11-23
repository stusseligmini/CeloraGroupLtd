# Remaining Work for Non-Custodial Migration

## ✅ Completed

1. **Database Schema** - Updated to remove encrypted private keys
2. **Client-Side Wallet Library** - Created `nonCustodialWallet.ts`
3. **Transaction Signing Library** - Created `transactionSigning.ts`
4. **Wallet Creation API** - Updated to accept only public keys
5. **Wallet Import API** - Created `/api/wallet/import`
6. **Send Transaction API** - Created `/api/wallet/send` (accepts signed transactions)
7. **Swap API** - Updated to accept signed transactions
8. **Swap Service** - Added broadcast methods for signed transactions
9. **Transaction Service** - Updated to broadcast signed transactions
10. **Validation Schemas** - Updated SwapExecuteRequestSchema

## ⚠️ Services Needing Refactoring

### 1. Multi-Sig Service (`src/server/services/multisigService.ts`)

**Issue:** Still references `encryptedPrivateKey` in multiple places:
- Lines 369, 395, 402, 500, 515, 520, 542, 547

**Required Changes:**
- Remove all `encryptedPrivateKey` checks
- Update `createMultiSigWallet()` to accept signed transaction instead
- Update `signTransaction()` to accept signed transaction from client
- Update `executeTransaction()` to accept signed transaction from client
- Multi-sig wallets need each signer to sign client-side

**Strategy:**
1. Each signer signs the transaction client-side
2. Client sends signed transaction to server
3. Server aggregates signatures
4. Server broadcasts when threshold is met

### 2. Recovery Service (`src/server/services/recoveryService.ts`)

**Issue:** Still references `encryptedPrivateKey` in multiple places:
- Lines 64, 102, 109, 191, 312, 442, 472, 603

**Required Changes:**
- Remove all `encryptedPrivateKey` checks
- Update recovery flow to use mnemonic phrase instead
- Guardians should sign recovery transactions client-side
- Recovery should use wallet import flow with mnemonic

**Strategy:**
1. User initiates recovery with mnemonic phrase
2. Guardians approve recovery (sign client-side)
3. System restores wallet using mnemonic
4. User regains access

## 🔧 Migration Steps

### Step 1: Update Multi-Sig Service

```typescript
// OLD (Custodial)
if (!wallet.encryptedPrivateKey) {
  throw new Error('Wallet private key not available');
}
const privateKey = decrypt(wallet.encryptedPrivateKey);

// NEW (Non-Custodial)
// Accept signed transaction from client
async function signTransaction(
  pendingTxId: string,
  signerId: string,
  signedTransaction: string // Client-signed transaction
): Promise<void>
```

### Step 2: Update Recovery Service

```typescript
// OLD (Custodial)
if (!wallet.encryptedPrivateKey) {
  throw new Error('Wallet private key not available');
}

// NEW (Non-Custodial)
// Use mnemonic-based recovery
async function initiateRecovery(
  userId: string,
  mnemonic: string, // User provides mnemonic
  guardianApprovals: Array<{ guardianId: string; signedApproval: string }>
): Promise<Wallet>
```

## 📝 Database Migration

**Note:** Migration SQL is ready in `prisma/migrations/20251123_non_custodial_migration/migration.sql`

To run migration:
```bash
# Set environment variables first
export DATABASE_URL="postgresql://..."
export DIRECT_DATABASE_URL="postgresql://..."

# Then run migration
npm run db:migrate
```

Or manually run the SQL:
```bash
psql $DATABASE_URL < prisma/migrations/20251123_non_custodial_migration/migration.sql
```

## 🚨 Breaking Changes

1. **Multi-Sig Wallets** - Will need to be recreated with new flow
2. **Recovery Process** - Now uses mnemonic instead of encrypted keys
3. **Existing Wallets** - Users need to re-import using mnemonic phrase
4. **API Changes**:
   - `/api/wallet/send` - Now requires `signedTransaction`
   - `/api/swap` - Now requires `signedTransaction`
   - Multi-sig endpoints - Need refactoring

## 📋 Testing Checklist

- [ ] Test wallet creation with new flow
- [ ] Test wallet import with mnemonic
- [ ] Test transaction sending (signed client-side)
- [ ] Test swap transactions (signed client-side)
- [ ] Test multi-sig wallet creation (needs refactoring)
- [ ] Test multi-sig transaction signing (needs refactoring)
- [ ] Test recovery flow (needs refactoring)
- [ ] Test browser extension (needs updating)
- [ ] Test mobile app (needs updating)

## 🎯 Next Priority Actions

1. **High Priority:**
   - Refactor multisigService.ts
   - Refactor recoveryService.ts
   - Run database migration (when DB is available)

2. **Medium Priority:**
   - Update browser extension
   - Update mobile app
   - Comprehensive testing

3. **Low Priority:**
   - Documentation updates
   - Performance optimization
   - User migration guide

## 📚 Related Files

- `NON_CUSTODIAL_MIGRATION.md` - Full migration guide
- `NON_CUSTODIAL_SUMMARY.md` - Summary of changes
- `prisma/migrations/20251123_non_custodial_migration/migration.sql` - Migration SQL
- `src/lib/wallet/nonCustodialWallet.ts` - Client wallet library
- `src/lib/wallet/transactionSigning.ts` - Transaction signing library

