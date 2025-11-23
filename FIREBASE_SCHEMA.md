# Celora Firebase Firestore Schema

## Overview

This document describes the Firebase Firestore database schema for Celora, mapped from the existing PostgreSQL/Prisma schema. The schema is designed for a non-custodial multi-chain wallet application focused on Solana gambling.

## Schema Design Principles

1. **Security Rules:** All collections require authentication. Users can only read/write their own data.
2. **Non-Custodial:** No private keys or encrypted mnemonics stored in Firestore (only hashes for verification).
3. **Denormalization:** Some data is duplicated for better read performance and offline support.
4. **Subcollections:** Used for related data (e.g., transactions under wallets).
5. **Indexes:** Composite indexes for common query patterns.

---

## Collections

### `/users/{userId}`

**Description:** User account information and preferences.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  azureB2CId: string; // Unique Azure AD B2C identifier
  email: string; // Unique email address
  emailVerified: boolean;
  
  // Profile
  displayName?: string;
  username?: string; // Unique username for @mentions (e.g., "dexter")
  phoneNumber?: string;
  
  // Security
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // Encrypted
  
  // Preferences
  preferredCardProvider?: 'stripe' | 'marqeta' | 'lithic';
  cardType?: 'virtual' | 'physical';
  
  // Telegram Integration
  telegramId?: string; // Unique Telegram user ID
  telegramUsername?: string;
  telegramLinkedAt?: Timestamp;
  telegramNotificationsEnabled: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

**Indexes:**
- `azureB2CId` (unique)
- `email` (unique)
- `username` (unique, where exists)
- `telegramId` (unique, where exists)

**Security Rules:**
```
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

---

### `/wallets/{walletId}`

**Description:** Blockchain wallet information. Only stores public keys and metadata - NEVER private keys.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  blockchain: 'solana' | 'ethereum' | 'bitcoin' | 'celo' | 'polygon' | 'arbitrum' | 'optimism';
  address: string; // Blockchain address
  publicKey?: string; // Public key
  
  // Non-Custodial: Only hash for verification
  mnemonicHash?: string; // SHA-256 hash of mnemonic (for recovery verification only)
  
  // Balance Cache (for performance)
  balanceCache?: string; // Balance in smallest unit (wei, lamports, satoshi)
  balanceFiat?: number; // Fiat balance in USD
  fiatCurrency: string; // Default: "USD"
  
  // Metadata
  label?: string; // User-friendly wallet name
  isDefault: boolean; // Default wallet for this blockchain
  isHardware: boolean; // Hardware wallet (Ledger, etc.)
  derivationPath?: string; // HD wallet derivation path
  
  // Hidden Vault Protection
  isHidden: boolean; // Hidden wallet in vault
  pinHash?: string; // Hashed PIN for vault access
  vaultLevel: number; // 0=normal, 1=hidden, 2=deep
  
  // Multi-Sig Support
  walletType: 'standard' | 'multisig' | 'hardware';
  requiredSignatures?: number; // For multisig wallets
  totalSigners?: number; // Total signers for multisig
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncedAt?: Timestamp; // Last balance sync
}
```

**Indexes:**
- `userId` (collection group index)
- `blockchain` (collection group index)
- `address` (unique per userId + blockchain)
- `isHidden` (where isHidden == true)

**Security Rules:**
```
match /wallets/{walletId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

---

### `/wallets/{walletId}/transactions/{transactionId}`

**Description:** Subcollection of blockchain transactions for a wallet.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  walletId: string; // Parent wallet reference
  txHash: string; // Unique transaction hash
  blockchain: string;
  blockNumber?: string; // BigInt as string
  
  // Transfer Details
  fromAddress: string;
  toAddress: string;
  amount: string; // Stored as string to avoid precision loss
  tokenSymbol?: string; // SOL, ETH, BTC, USDC, etc.
  tokenAddress?: string; // Token contract address
  
  // Fees
  gasFee?: string;
  gasPrice?: string;
  gasUsed?: string;
  
  // Status
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  
  // Metadata
  type?: 'send' | 'receive' | 'swap' | 'contract';
  memo?: string;
  
  // Casino Transaction Labels (Solana-specific)
  isCasinoTx?: boolean;
  casinoLabel?: string; // e.g., "Roobet Deposit", "Stake Win"
  transactionType?: 'casino_deposit' | 'casino_withdrawal' | 'win' | 'loss';
  
  // Timestamps
  timestamp: Timestamp; // Block timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `txHash` (unique)
- `status`
- `timestamp` (descending)
- `blockchain`
- `isCasinoTx` (where isCasinoTx == true)
- Composite: `[blockchain, timestamp]`

**Security Rules:**
```
match /wallets/{walletId}/transactions/{transactionId} {
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/wallets/$(walletId)).data.userId == request.auth.uid;
  allow create: if request.auth != null;
  allow update, delete: if false; // Transactions are immutable
}
```

---

### `/cards/{cardId}`

**Description:** Virtual and physical debit cards linked to wallets.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  walletId: string; // Reference to linked wallet
  
  // Card Details (Encrypted)
  encryptedNumber: string; // Encrypted card number
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  // CVV is NEVER stored (PCI DSS compliance)
  
  // Metadata
  nickname?: string;
  brand: 'VISA' | 'MASTERCARD';
  type: 'virtual' | 'physical';
  
  // Limits and Controls
  spendingLimit?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  
  // Spending Tracking
  totalSpent: number;
  monthlySpent: number;
  lastResetAt: Timestamp;
  
  // Status
  status: 'active' | 'frozen' | 'cancelled';
  isOnline: boolean;
  isContactless: boolean;
  isATM: boolean;
  
  // Advanced Controls
  isDisposable: boolean; // Auto-destroy after first use
  allowedMCC: string[]; // Merchant category codes whitelist
  blockedMCC: string[]; // Blocked MCCs
  allowedCountries: string[]; // ISO country codes
  blockedCountries: string[];
  cashbackRate?: number; // 0.02 = 2%
  
  // Rewards
  rewardsEarned: number;
  loyaltyPoints: number;
  
  // Wallet Provisioning
  applePayTokenId?: string;
  googlePayTokenId?: string;
  
  // Physical Card
  physicalCardOrdered: boolean;
  physicalCardShippedAt?: Timestamp;
  
  // Provider
  provider?: 'stripe' | 'marqeta' | 'lithic';
  providerCardId?: string;
  providerStatus?: string;
  
  // Subscription
  isSubscription: boolean;
  subscriptionName?: string;
  subscriptionCycle?: 'monthly' | 'yearly';
  nextBillingDate?: Timestamp;
  
  // Security
  pin?: string; // Encrypted PIN
  lastUsedAt?: Timestamp;
  freezeReason?: string;
  autoFreezeRules?: object; // JSON object
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activatedAt?: Timestamp;
  cancelledAt?: Timestamp;
}
```

**Indexes:**
- `userId`
- `walletId`
- `status`
- `[expiryYear, expiryMonth]`
- `isDisposable`
- `isSubscription`

**Security Rules:**
```
match /cards/{cardId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

---

### `/cards/{cardId}/transactions/{transactionId}`

**Description:** Subcollection of card transactions.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  cardId: string; // Parent card reference
  userId: string; // Reference to user
  
  // Transaction Details
  amount: number;
  currency: string; // Default: "USD"
  merchantName: string;
  merchantCity?: string;
  merchantCountry: string;
  mcc: string; // Merchant Category Code
  mccDescription?: string;
  
  // Geolocation
  latitude?: number;
  longitude?: number;
  
  // Status
  status: 'pending' | 'approved' | 'declined' | 'reversed';
  declineReason?: string;
  
  // Smart Features
  isRecurring: boolean;
  recurringGroup?: string;
  cashbackAmount?: number;
  cashbackToken?: string; // Crypto token symbol
  
  // AI Insights
  category?: string; // 'groceries', 'transport', 'entertainment'
  tags: string[];
  isAnomaly: boolean; // Unusual spending pattern
  
  // Timestamps
  transactionDate: Timestamp;
  settledDate?: Timestamp;
  createdAt: Timestamp;
}
```

**Indexes:**
- `cardId`
- `userId`
- `status`
- `transactionDate` (descending)
- `merchantCountry`
- `mcc`
- `isRecurring`
- `category`

---

### `/notifications/{notificationId}`

**Description:** User notifications (transaction alerts, security, system).

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  
  // Content
  type: 'transaction' | 'security' | 'system' | 'promotion';
  title: string;
  body: string;
  
  // Delivery Channels
  channels: ('push' | 'email' | 'in-app' | 'telegram')[];
  
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Deep Linking
  actionUrl?: string;
  actionLabel?: string;
  
  // Metadata
  metadata?: object; // JSON object
  
  // Timestamps
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  readAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId`
- `type`
- `status`
- `priority`
- `createdAt` (descending)
- Composite: `[userId, status, createdAt]`

**Security Rules:**
```
match /notifications/{notificationId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

---

### `/usernames/{username}`

**Description:** Username to wallet address mapping (for @username.sol system).

**Document Structure:**
```typescript
{
  // Identity
  username: string; // Document ID (e.g., "dexter")
  userId: string; // Reference to user
  solanaAddress: string; // Resolved Solana address
  publicKey?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `username` (unique, document ID)
- `userId`
- `solanaAddress`

**Security Rules:**
```
match /usernames/{username} {
  allow read: if request.auth != null; // Usernames are public for resolution
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

---

### `/sessions/{sessionId}`

**Description:** User session tracking (MSAL tokens, authentication state).

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  sessionToken: string; // Unique session token
  
  // MSAL Token Info (Encrypted)
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  idToken?: string; // Encrypted
  expiresAt: Timestamp;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId`
- `sessionToken` (unique)
- `expiresAt`

**Security Rules:**
```
match /sessions/{sessionId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

---

### `/telegramUsers/{telegramId}`

**Description:** Telegram bot user information.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user (unique)
  telegramId: string; // Telegram user ID (unique, document ID)
  chatId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  
  // Verification
  verificationCode?: string;
  verificationExpiresAt?: Timestamp;
  
  // Status
  isActive: boolean;
  linkedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `telegramId` (unique, document ID)
- `userId` (unique)

---

### `/stakingPositions/{positionId}`

**Description:** Staked cryptocurrency positions.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  walletId: string; // Reference to wallet
  blockchain: string;
  
  // Staking Details
  amount: string; // Staked amount
  validatorAddress?: string;
  apr?: number; // Annual percentage rate
  rewards: string; // Accumulated rewards
  status: 'active' | 'unstaking' | 'completed';
  
  // Protocol Details (Solana-specific)
  protocol?: 'native' | 'lido' | 'marinade';
  validator?: string;
  stakedAmount?: string;
  stakedAt?: Timestamp;
  stakeAccountAddress?: string; // Solana stake account
  currentApy?: number;
  
  // Unstaking
  unstakeRequestedAt?: Timestamp;
  unstakeTxHash?: string;
  
  // Transaction
  txHash?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId`
- `walletId`
- `blockchain`
- `status`

---

### `/scheduledPayments/{paymentId}`

**Description:** Recurring/scheduled payment automation.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId: string; // Reference to user
  walletId: string; // Reference to wallet
  toAddress: string;
  amount: string;
  blockchain: string;
  tokenSymbol?: string;
  
  // Schedule
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  nextRunAt: Timestamp;
  lastRunAt?: Timestamp;
  
  // Control
  isActive: boolean;
  isPaused: boolean;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Limits
  maxExecutions?: number;
  executionCount: number;
  totalAmountLimit?: string;
  
  // Metadata
  memo?: string;
  
  // Timestamps
  createdAt: Timestamp;
}
```

**Indexes:**
- `userId`
- `walletId`
- `status`
- `nextRunAt`
- Composite: `[status, nextRunAt]` (for scheduled job queries)

---

### `/paymentRequests/{requestId}`

**Description:** Payment requests between users.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  senderId: string; // Request sender
  receiverId: string; // Request receiver
  amount: string;
  blockchain: string;
  tokenSymbol?: string;
  
  // Status
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  txHash?: string;
  fulfilledTxHash?: string;
  fulfilledAt?: Timestamp;
  
  // Type
  requestType?: 'single' | 'split_bill';
  splitBillId?: string;
  
  // Metadata
  memo?: string;
  
  // Timestamps
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

**Indexes:**
- `senderId`
- `receiverId`
- `status`
- `splitBillId`
- `expiresAt`

---

### `/auditLogs/{logId}`

**Description:** Security and action audit logs.

**Document Structure:**
```typescript
{
  // Identity
  id: string; // UUID
  userId?: string; // Optional (for system events)
  
  // Action Details
  action: string; // e.g., "wallet.created", "transaction.sent"
  resource: string; // e.g., "wallet", "transaction"
  resourceId?: string;
  
  // Request Metadata
  ipAddress?: string;
  userAgent?: string;
  platform: 'web' | 'mobile' | 'telegram' | 'api';
  
  // Log Data
  metadata?: object; // JSON object
  severity: 'info' | 'warning' | 'error' | 'critical';
  status?: string;
  
  // Timestamp
  createdAt: Timestamp;
}
```

**Indexes:**
- `userId`
- `action`
- `createdAt` (descending)
- Composite: `[userId, createdAt]`
- Composite: `[action, createdAt]`

---

## Security Rules Summary

### Common Patterns

1. **User Data Access:**
   - Users can only read/write their own data
   - All collections check `userId` matches authenticated user

2. **Public Data:**
   - Usernames collection: Read access for all authenticated users (for username resolution)
   - Wallets collection: Read access only for wallet owner

3. **Immutable Data:**
   - Transactions: Create only, no updates/deletes
   - Audit logs: Create only

4. **Subcollections:**
   - Access controlled by parent document
   - Must verify parent document's `userId` matches authenticated user

### Example Security Rules Template

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check authentication
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Wallets collection
    match /wallets/{walletId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
      
      // Transactions subcollection
      match /transactions/{transactionId} {
        allow read: if isAuthenticated() && 
          get(/databases/$(database)/documents/wallets/$(walletId)).data.userId == request.auth.uid;
        allow create: if isAuthenticated();
        allow update, delete: if false; // Immutable
      }
    }
    
    // Usernames (public read for resolution)
    match /usernames/{username} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## Indexes Required

### Single Field Indexes
- `users.email`
- `users.username`
- `users.telegramId`
- `wallets.userId` (collection group)
- `wallets.blockchain` (collection group)
- `wallets.address`
- `notifications.userId`
- `notifications.status`
- `notifications.createdAt`

### Composite Indexes
- `wallets` collection: `[userId, blockchain, createdAt]`
- `transactions` subcollection: `[blockchain, timestamp]`
- `notifications` collection: `[userId, status, createdAt]`
- `scheduledPayments` collection: `[status, nextRunAt]`
- `paymentRequests` collection: `[receiverId, status, createdAt]`

---

## Migration Notes

### From PostgreSQL to Firestore

1. **Relationships:** Convert foreign keys to document references or duplicate IDs
2. **Timestamps:** Convert DateTime to Firestore Timestamp
3. **BigInt:** Convert to string (e.g., blockNumber)
4. **Decimal:** Convert to number (for balances) or string (for precision-critical values)
5. **JSON Fields:** Store as Firestore Map/Object types
6. **Arrays:** Store as Firestore Array type
7. **Unique Constraints:** Enforce via Security Rules and Cloud Functions

### Data Synchronization

For hybrid PostgreSQL/Firestore setup:
- **Firestore:** Real-time features, mobile offline support, quick reads
- **PostgreSQL:** Complex queries, analytics, backup/recovery
- **Sync:** Use Cloud Functions to keep both in sync

---

## Usage Examples

### Query User's Solana Wallets
```typescript
const walletsRef = collection(db, 'wallets');
const q = query(
  walletsRef,
  where('userId', '==', userId),
  where('blockchain', '==', 'solana')
);
const wallets = await getDocs(q);
```

### Get Recent Transactions for Wallet
```typescript
const transactionsRef = collection(
  db,
  'wallets',
  walletId,
  'transactions'
);
const q = query(
  transactionsRef,
  orderBy('timestamp', 'desc'),
  limit(20)
);
const transactions = await getDocs(q);
```

### Resolve Username to Address
```typescript
const usernameDoc = await getDoc(doc(db, 'usernames', 'dexter'));
const solanaAddress = usernameDoc.data()?.solanaAddress;
```

### Listen to Real-time Notifications
```typescript
const notificationsRef = collection(db, 'notifications');
const q = query(
  notificationsRef,
  where('userId', '==', userId),
  where('status', '==', 'unread'),
  orderBy('createdAt', 'desc')
);
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // New notification
    }
  });
});
```

---

This schema is designed for scalability, security, and real-time capabilities while maintaining the non-custodial principles of Celora.


