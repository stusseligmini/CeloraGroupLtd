# Celora GraphQL API Schema

## Overview

This document describes the GraphQL API schema for Celora, mapping from the Firestore/Prisma database schema. The GraphQL API provides type-safe queries and mutations for all Celora features.

---

## Root Types

```graphql
type Query {
  # User queries
  user: User
  me: User
  
  # Wallet queries
  wallets(blockchain: String): [Wallet!]!
  wallet(id: ID!): Wallet
  walletByAddress(address: String!, blockchain: String!): Wallet
  
  # Transaction queries
  transactions(
    walletId: ID
    blockchain: String
    limit: Int = 20
    offset: Int = 0
    status: TransactionStatus
  ): [Transaction!]!
  transaction(id: ID!): Transaction
  
  # Card queries
  cards: [Card!]!
  card(id: ID!): Card
  cardTransactions(cardId: ID!, limit: Int = 20): [CardTransaction!]!
  
  # Notification queries
  notifications(
    type: NotificationType
    status: NotificationStatus
    limit: Int = 20
  ): [Notification!]!
  notification(id: ID!): Notification
  
  # Payment request queries
  paymentRequests(
    status: PaymentRequestStatus
    asSender: Boolean
    asReceiver: Boolean
  ): [PaymentRequest!]!
  paymentRequest(id: ID!): PaymentRequest
  
  # Staking queries
  stakingPositions(blockchain: String): [StakingPosition!]!
  stakingPosition(id: ID!): StakingPosition
  
  # Scheduled payment queries
  scheduledPayments(status: ScheduledPaymentStatus): [ScheduledPayment!]!
  scheduledPayment(id: ID!): ScheduledPayment
  
  # NFT queries
  nfts(walletId: ID, blockchain: String): [NFT!]!
  nft(id: ID!): NFT
  
  # Username resolution
  resolveUsername(username: String!): UsernameResolution
  
  # Spending insights
  spendingInsights(period: String): [SpendingInsight!]!
  cardInsights(cardId: ID): [CardInsight!]!
  
  # Audit logs
  auditLogs(action: String, limit: Int = 50): [AuditLog!]!
}

type Mutation {
  # User mutations
  updateProfile(input: UpdateProfileInput!): User!
  updatePreferences(input: UpdatePreferencesInput!): User!
  linkTelegram(telegramId: String!, verificationCode: String!): User!
  
  # Wallet mutations
  createWallet(input: CreateWalletInput!): Wallet!
  importWallet(input: ImportWalletInput!): Wallet!
  updateWallet(id: ID!, input: UpdateWalletInput!): Wallet!
  deleteWallet(id: ID!): Boolean!
  
  # Hidden vault mutations
  createHiddenWallet(input: CreateHiddenWalletInput!): Wallet!
  unlockVault(pin: String!): Boolean!
  
  # Transaction mutations
  sendTransaction(input: SendTransactionInput!): Transaction!
  sendSolanaTransaction(input: SendSolanaTransactionInput!): Transaction!
  
  # Card mutations
  createCard(input: CreateCardInput!): Card!
  updateCard(id: ID!, input: UpdateCardInput!): Card!
  freezeCard(id: ID!, reason: String): Card!
  unfreezeCard(id: ID!): Card!
  cancelCard(id: ID!): Card!
  updateCardControls(id: ID!, input: UpdateCardControlsInput!): Card!
  
  # Card transaction mutations
  authorizeCardTransaction(input: AuthorizeCardTransactionInput!): CardTransaction!
  
  # Notification mutations
  markNotificationRead(id: ID!): Notification!
  markAllNotificationsRead: Int!
  deleteNotification(id: ID!): Boolean!
  
  # Payment request mutations
  createPaymentRequest(input: CreatePaymentRequestInput!): PaymentRequest!
  fulfillPaymentRequest(id: ID!, txHash: String): PaymentRequest!
  cancelPaymentRequest(id: ID!): PaymentRequest!
  
  # Staking mutations
  createStakingPosition(input: CreateStakingPositionInput!): StakingPosition!
  unstakePosition(id: ID!): Transaction!
  
  # Scheduled payment mutations
  createScheduledPayment(input: CreateScheduledPaymentInput!): ScheduledPayment!
  updateScheduledPayment(id: ID!, input: UpdateScheduledPaymentInput!): ScheduledPayment!
  pauseScheduledPayment(id: ID!): ScheduledPayment!
  resumeScheduledPayment(id: ID!): ScheduledPayment!
  cancelScheduledPayment(id: ID!): Boolean!
  
  # Multi-sig mutations
  createMultiSigWallet(input: CreateMultiSigWalletInput!): Wallet!
  addMultiSigSigner(walletId: ID!, input: AddSignerInput!): MultiSigSigner!
  createPendingTransaction(input: CreatePendingTransactionInput!): PendingTransaction!
  signPendingTransaction(id: ID!, signature: String!): PendingTransaction!
  executePendingTransaction(id: ID!): Transaction!
  
  # Username mutations
  setUsername(username: String!, solanaAddress: String!): Username!
  updateUsername(username: String!, solanaAddress: String!): Username!
  deleteUsername(username: String!): Boolean!
  
  # Contact mutations
  addContact(input: AddContactInput!): UserContact!
  deleteContact(id: ID!): Boolean!
  
  # Spending limit mutations
  createSpendingLimit(input: CreateSpendingLimitInput!): SpendingLimit!
  updateSpendingLimit(id: ID!, input: UpdateSpendingLimitInput!): SpendingLimit!
  deleteSpendingLimit(id: ID!): Boolean!
}
```

---

## Types

### User

```graphql
type User {
  id: ID!
  azureB2CId: String!
  email: String!
  emailVerified: Boolean!
  displayName: String
  username: String
  phoneNumber: String
  twoFactorEnabled: Boolean!
  preferredCardProvider: CardProvider
  cardType: CardType
  
  # Telegram integration
  telegramId: String
  telegramUsername: String
  telegramLinkedAt: DateTime
  telegramNotificationsEnabled: Boolean!
  
  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  lastLoginAt: DateTime
  
  # Relations
  wallets: [Wallet!]!
  notifications: [Notification!]!
  cards: [Card!]!
}
```

### Wallet

```graphql
type Wallet {
  id: ID!
  userId: ID!
  blockchain: Blockchain!
  address: String!
  publicKey: String
  mnemonicHash: String  # Only hash, never actual mnemonic
  
  # Balance cache
  balanceCache: String
  balanceFiat: Float
  fiatCurrency: String!
  
  # Metadata
  label: String
  isDefault: Boolean!
  isHardware: Boolean!
  derivationPath: String
  
  # Hidden vault
  isHidden: Boolean!
  pinHash: String
  vaultLevel: Int!
  
  # Multi-sig
  walletType: WalletType!
  requiredSignatures: Int
  totalSigners: Int
  
  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  lastSyncedAt: DateTime
  
  # Relations
  transactions: [Transaction!]!
  cards: [Card!]!
  guardians: [WalletGuardian!]!
  multiSigSigners: [MultiSigSigner!]!
  stakingPositions: [StakingPosition!]!
  scheduledPayments: [ScheduledPayment!]!
}
```

### Transaction

```graphql
type Transaction {
  id: ID!
  walletId: ID!
  txHash: String!
  blockchain: Blockchain!
  blockNumber: String
  fromAddress: String!
  toAddress: String!
  amount: String!
  tokenSymbol: String
  tokenAddress: String
  gasFee: String
  gasPrice: String
  gasUsed: String
  status: TransactionStatus!
  confirmations: Int!
  type: TransactionType
  memo: String
  timestamp: DateTime!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Card

```graphql
type Card {
  id: ID!
  userId: ID!
  walletId: ID!
  encryptedNumber: String!
  cardholderName: String!
  expiryMonth: Int!
  expiryYear: Int!
  nickname: String
  brand: CardBrand!
  type: CardType!
  
  # Limits
  spendingLimit: Float
  dailyLimit: Float
  monthlyLimit: Float
  
  # Spending tracking
  totalSpent: Float!
  monthlySpent: Float!
  lastResetAt: DateTime!
  
  # Status
  status: CardStatus!
  isOnline: Boolean!
  isContactless: Boolean!
  isATM: Boolean!
  
  # Advanced controls
  isDisposable: Boolean!
  allowedMCC: [String!]!
  blockedMCC: [String!]!
  allowedCountries: [String!]!
  blockedCountries: [String!]!
  cashbackRate: Float
  
  # Rewards
  rewardsEarned: Float!
  loyaltyPoints: Int!
  
  # Provider
  provider: CardProvider
  providerCardId: String
  providerStatus: String
  
  # Subscription tracking
  isSubscription: Boolean!
  subscriptionName: String
  subscriptionCycle: SubscriptionCycle
  nextBillingDate: DateTime
  
  # Security
  lastUsedAt: DateTime
  freezeReason: String
  autoFreezeRules: JSON
  
  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  activatedAt: DateTime
  cancelledAt: DateTime
  
  # Relations
  transactions: [CardTransaction!]!
}
```

### CardTransaction

```graphql
type CardTransaction {
  id: ID!
  cardId: ID!
  userId: ID!
  amount: Float!
  currency: String!
  merchantName: String!
  merchantCity: String
  merchantCountry: String!
  mcc: String!
  mccDescription: String
  latitude: Float
  longitude: Float
  status: CardTransactionStatus!
  declineReason: String
  isRecurring: Boolean!
  recurringGroup: String
  cashbackAmount: Float
  cashbackToken: String
  category: String
  tags: [String!]!
  isAnomaly: Boolean!
  transactionDate: DateTime!
  settledDate: DateTime
  createdAt: DateTime!
}
```

### Notification

```graphql
type Notification {
  id: ID!
  userId: ID!
  type: NotificationType!
  title: String!
  body: String!
  channels: [NotificationChannel!]!
  status: NotificationStatus!
  priority: NotificationPriority!
  actionUrl: String
  actionLabel: String
  metadata: JSON
  sentAt: DateTime
  deliveredAt: DateTime
  readAt: DateTime
  expiresAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### PaymentRequest

```graphql
type PaymentRequest {
  id: ID!
  senderId: ID!
  receiverId: ID!
  amount: String!
  blockchain: Blockchain!
  tokenSymbol: String
  memo: String
  status: PaymentRequestStatus!
  txHash: String
  requestType: PaymentRequestType
  splitBillId: String
  fulfilledTxHash: String
  fulfilledAt: DateTime
  createdAt: DateTime!
  expiresAt: DateTime!
}
```

### StakingPosition

```graphql
type StakingPosition {
  id: ID!
  userId: ID!
  walletId: ID!
  blockchain: Blockchain!
  amount: String!
  validatorAddress: String
  apr: Float
  rewards: String!
  status: StakingStatus!
  protocol: StakingProtocol
  validator: String
  stakedAmount: String
  stakedAt: DateTime
  stakeAccountAddress: String
  currentApy: Float
  unstakeRequestedAt: DateTime
  unstakeTxHash: String
  txHash: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### ScheduledPayment

```graphql
type ScheduledPayment {
  id: ID!
  userId: ID!
  walletId: ID!
  toAddress: String!
  amount: String!
  blockchain: Blockchain!
  tokenSymbol: String
  frequency: PaymentFrequency!
  memo: String
  isActive: Boolean!
  isPaused: Boolean!
  maxExecutions: Int
  executionCount: Int!
  totalAmountLimit: String
  nextRunAt: DateTime!
  lastRunAt: DateTime
  status: ScheduledPaymentStatus!
  createdAt: DateTime!
  executions: [ScheduledPaymentExecution!]!
}
```

### MultiSigSigner

```graphql
type MultiSigSigner {
  id: ID!
  walletId: ID!
  address: String!
  name: String
  email: String
  createdAt: DateTime!
}
```

### PendingTransaction

```graphql
type PendingTransaction {
  id: ID!
  walletId: ID!
  toAddress: String!
  amount: String!
  blockchain: Blockchain!
  data: String
  memo: String
  signedBy: [String!]!
  signatures: JSON!
  requiredSigs: Int!
  currentSigs: Int!
  createdBy: ID!
  executedTxHash: String
  status: PendingTransactionStatus!
  createdAt: DateTime!
  expiresAt: DateTime!
}
```

### Username

```graphql
type Username {
  username: String!
  userId: ID!
  solanaAddress: String!
  publicKey: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### UserContact

```graphql
type UserContact {
  id: ID!
  userId: ID!
  contactType: ContactType!
  contactValue: String!
  displayName: String
  nickname: String
  resolvedAddress: String
  resolvedBlockchain: Blockchain
  metadata: JSON
  lastUsedAt: DateTime
  createdAt: DateTime!
}
```

### SpendingLimit

```graphql
type SpendingLimit {
  id: ID!
  userId: ID!
  limitType: LimitType!
  amount: Float!
  walletId: ID
  cardId: ID
  category: String
  currentSpent: Float!
  periodStart: DateTime
  periodEnd: DateTime
  resetAt: DateTime!
  isActive: Boolean!
  alertAt: Float
  alertSent: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### CardInsight

```graphql
type CardInsight {
  id: ID!
  userId: ID!
  cardId: ID
  type: CardInsightType!
  severity: InsightSeverity!
  title: String!
  description: String!
  recommendation: String
  amount: Float
  category: String
  metadata: JSON
  isRead: Boolean!
  isDismissed: Boolean!
  insightDate: DateTime!
  createdAt: DateTime!
}
```

### SpendingInsight

```graphql
type SpendingInsight {
  id: ID!
  userId: ID!
  insightType: String!
  title: String
  description: String
  category: String
  amount: Float
  percentage: Float
  period: String!
  severity: InsightSeverity
  insightDate: DateTime
  data: JSON!
  createdAt: DateTime!
}
```

### AuditLog

```graphql
type AuditLog {
  id: ID!
  userId: ID
  action: String!
  resource: String!
  resourceId: String
  ipAddress: String
  userAgent: String
  platform: Platform
  metadata: JSON
  severity: AuditSeverity!
  status: String
  createdAt: DateTime!
}
```

---

## Enums

```graphql
enum Blockchain {
  SOLANA
  ETHEREUM
  BITCOIN
  CELO
  POLYGON
  ARBITRUM
  OPTIMISM
}

enum TransactionStatus {
  PENDING
  CONFIRMED
  FAILED
}

enum TransactionType {
  SEND
  RECEIVE
  SWAP
  CONTRACT
}

enum CardBrand {
  VISA
  MASTERCARD
}

enum CardType {
  VIRTUAL
  PHYSICAL
}

enum CardStatus {
  ACTIVE
  FROZEN
  CANCELLED
}

enum CardProvider {
  STRIPE
  MARQETA
  LITHIC
}

enum CardTransactionStatus {
  PENDING
  APPROVED
  DECLINED
  REVERSED
}

enum NotificationType {
  TRANSACTION
  SECURITY
  SYSTEM
  PROMOTION
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ
}

enum NotificationChannel {
  PUSH
  EMAIL
  IN_APP
  TELEGRAM
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum PaymentRequestStatus {
  PENDING
  FULFILLED
  CANCELLED
  EXPIRED
}

enum PaymentRequestType {
  SINGLE
  SPLIT_BILL
}

enum StakingStatus {
  ACTIVE
  UNSTAKING
  COMPLETED
}

enum StakingProtocol {
  NATIVE
  LIDO
  MARINADE
}

enum PaymentFrequency {
  ONCE
  DAILY
  WEEKLY
  MONTHLY
}

enum ScheduledPaymentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum PendingTransactionStatus {
  PENDING
  EXECUTED
  EXPIRED
  CANCELLED
}

enum WalletType {
  STANDARD
  MULTISIG
  HARDWARE
}

enum ContactType {
  PHONE
  USERNAME
  ADDRESS
}

enum LimitType {
  DAILY
  WEEKLY
  MONTHLY
  CATEGORY
}

enum CardInsightType {
  SPENDING_SPIKE
  RECURRING_FOUND
  BUDGET_WARNING
  FRAUD_ALERT
  SAVINGS_OPPORTUNITY
}

enum InsightSeverity {
  INFO
  WARNING
  CRITICAL
}

enum SubscriptionCycle {
  MONTHLY
  YEARLY
}

enum Platform {
  WEB
  MOBILE
  TELEGRAM
  API
}

enum AuditSeverity {
  INFO
  WARNING
  ERROR
  CRITICAL
}

scalar DateTime
scalar JSON
```

---

## Input Types

### CreateWalletInput

```graphql
input CreateWalletInput {
  blockchain: Blockchain!
  label: String
  isDefault: Boolean
  derivationPath: String
}
```

### ImportWalletInput

```graphql
input ImportWalletInput {
  blockchain: Blockchain!
  address: String!
  label: String
  isDefault: Boolean
}
```

### UpdateWalletInput

```graphql
input UpdateWalletInput {
  label: String
  isDefault: Boolean
}
```

### CreateHiddenWalletInput

```graphql
input CreateHiddenWalletInput {
  blockchain: Blockchain!
  label: String
  pin: String!
  vaultLevel: Int = 1
}
```

### SendTransactionInput

```graphql
input SendTransactionInput {
  walletId: ID!
  toAddress: String!
  amount: String!
  blockchain: Blockchain!
  tokenSymbol: String
  memo: String
}
```

### SendSolanaTransactionInput

```graphql
input SendSolanaTransactionInput {
  walletId: ID!
  toAddress: String!
  amount: String!  # In SOL (lamports)
  memo: String
}
```

### CreateCardInput

```graphql
input CreateCardInput {
  walletId: ID!
  cardholderName: String!
  nickname: String
  type: CardType!
  spendingLimit: Float
  dailyLimit: Float
  monthlyLimit: Float
  isDisposable: Boolean
  allowedMCC: [String!]
  blockedMCC: [String!]
  allowedCountries: [String!]
  blockedCountries: [String!]
  cashbackRate: Float
}
```

### UpdateCardInput

```graphql
input UpdateCardInput {
  nickname: String
  spendingLimit: Float
  dailyLimit: Float
  monthlyLimit: Float
  isOnline: Boolean
  isContactless: Boolean
  isATM: Boolean
}
```

### UpdateCardControlsInput

```graphql
input UpdateCardControlsInput {
  allowedMCC: [String!]
  blockedMCC: [String!]
  allowedCountries: [String!]
  blockedCountries: [String!]
  cashbackRate: Float
  autoFreezeRules: JSON
}
```

### AuthorizeCardTransactionInput

```graphql
input AuthorizeCardTransactionInput {
  cardId: ID!
  amount: Float!
  merchantName: String!
  merchantCountry: String!
  mcc: String!
}
```

### UpdateProfileInput

```graphql
input UpdateProfileInput {
  displayName: String
  username: String
  phoneNumber: String
}
```

### UpdatePreferencesInput

```graphql
input UpdatePreferencesInput {
  preferredCardProvider: CardProvider
  cardType: CardType
  telegramNotificationsEnabled: Boolean
}
```

### CreatePaymentRequestInput

```graphql
input CreatePaymentRequestInput {
  receiverId: ID!
  receiverUsername: String
  receiverAddress: String
  amount: String!
  blockchain: Blockchain!
  tokenSymbol: String
  memo: String
  expiresIn: Int  # Hours until expiration
  requestType: PaymentRequestType
  splitBillId: String
}
```

### CreateStakingPositionInput

```graphql
input CreateStakingPositionInput {
  walletId: ID!
  amount: String!
  blockchain: Blockchain!
  validatorAddress: String
  protocol: StakingProtocol
}
```

### CreateScheduledPaymentInput

```graphql
input CreateScheduledPaymentInput {
  walletId: ID!
  toAddress: String!
  amount: String!
  blockchain: Blockchain!
  tokenSymbol: String
  frequency: PaymentFrequency!
  nextRunAt: DateTime!
  memo: String
  maxExecutions: Int
  totalAmountLimit: String
}
```

### UpdateScheduledPaymentInput

```graphql
input UpdateScheduledPaymentInput {
  amount: String
  frequency: PaymentFrequency
  nextRunAt: DateTime
  memo: String
  isPaused: Boolean
}
```

### CreateMultiSigWalletInput

```graphql
input CreateMultiSigWalletInput {
  blockchain: Blockchain!
  label: String
  requiredSignatures: Int!
  totalSigners: Int!
  signers: [AddSignerInput!]!
}
```

### AddSignerInput

```graphql
input AddSignerInput {
  address: String!
  name: String
  email: String
}
```

### CreatePendingTransactionInput

```graphql
input CreatePendingTransactionInput {
  walletId: ID!
  toAddress: String!
  amount: String!
  blockchain: Blockchain!
  data: String
  memo: String
}
```

### AddContactInput

```graphql
input AddContactInput {
  contactType: ContactType!
  contactValue: String!
  displayName: String
  nickname: String
}
```

### CreateSpendingLimitInput

```graphql
input CreateSpendingLimitInput {
  limitType: LimitType!
  amount: Float!
  walletId: ID
  cardId: ID
  category: String
  alertAt: Float
}
```

### UpdateSpendingLimitInput

```graphql
input UpdateSpendingLimitInput {
  amount: Float
  alertAt: Float
  isActive: Boolean
}
```

---

## Example Queries

### Get User Profile

```graphql
query GetMe {
  me {
    id
    email
    displayName
    username
    wallets {
      id
      blockchain
      address
      balanceFiat
      isDefault
    }
  }
}
```

### Get Wallet Transactions

```graphql
query GetWalletTransactions($walletId: ID!, $limit: Int) {
  transactions(walletId: $walletId, limit: $limit) {
    id
    txHash
    fromAddress
    toAddress
    amount
    tokenSymbol
    status
    timestamp
  }
}
```

### Get Cards with Insights

```graphql
query GetCards {
  cards {
    id
    nickname
    brand
    status
    totalSpent
    monthlySpent
    cashbackRate
    transactions(limit: 5) {
      id
      amount
      merchantName
      transactionDate
    }
  }
  cardInsights {
    id
    type
    severity
    title
    description
    isRead
  }
}
```

### Get Solana Staking Positions

```graphql
query GetSolanaStaking($blockchain: Blockchain) {
  stakingPositions(blockchain: $blockchain) {
    id
    amount
    rewards
    apr
    currentApy
    status
    protocol
  }
}
```

---

## Example Mutations

### Create Solana Wallet

```graphql
mutation CreateSolanaWallet {
  createWallet(input: {
    blockchain: SOLANA
    label: "My Solana Wallet"
    isDefault: true
  }) {
    id
    address
    blockchain
    balanceFiat
  }
}
```

### Send Transaction

```graphql
mutation SendSOL($input: SendSolanaTransactionInput!) {
  sendSolanaTransaction(input: $input) {
    id
    txHash
    status
    timestamp
  }
}
```

Variables:
```json
{
  "input": {
    "walletId": "wallet-id",
    "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "amount": "1000000000",
    "memo": "Payment for services"
  }
}
```

### Create Virtual Card

```graphql
mutation CreateCard($input: CreateCardInput!) {
  createCard(input: $input) {
    id
    encryptedNumber
    cardholderName
    expiryMonth
    expiryYear
    brand
    status
  }
}
```

### Freeze Card

```graphql
mutation FreezeCard($id: ID!, $reason: String) {
  freezeCard(id: $id, reason: $reason) {
    id
    status
    freezeReason
  }
}
```

### Create Payment Request

```graphql
mutation RequestPayment($input: CreatePaymentRequestInput!) {
  createPaymentRequest(input: $input) {
    id
    amount
    blockchain
    status
    expiresAt
    senderId
    receiverId
  }
}
```

### Stake Solana

```graphql
mutation StakeSolana($input: CreateStakingPositionInput!) {
  createStakingPosition(input: $input) {
    id
    amount
    rewards
    status
    apr
  }
}
```

---

## Authentication

All queries and mutations require authentication. Include the Firebase Auth token in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

Or use the `Authentication` tab in GraphQL playground to set up authentication.

---

## Error Handling

The GraphQL API returns standard GraphQL errors with the following structure:

```json
{
  "errors": [
    {
      "message": "Error message",
      "extensions": {
        "code": "ERROR_CODE",
        "field": "fieldName",
        "path": ["field", "path"]
      }
    }
  ]
}
```

Common error codes:
- `UNAUTHENTICATED` - Not authenticated
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Input validation failed
- `INSUFFICIENT_BALANCE` - Insufficient wallet balance
- `TRANSACTION_FAILED` - Transaction execution failed

---

This GraphQL schema provides complete coverage of all Celora features and data models, enabling type-safe API interactions from web, mobile, and Telegram clients.

