# Celora Application Description

## Overview

Celora is a **non-custodial multi-chain cryptocurrency wallet** optimized for Solana gambling applications. It provides a secure, user-friendly interface for managing cryptocurrency wallets across multiple blockchains, with specialized features for online casino transactions and gambling activities.

## Core Architecture

### Non-Custodial Design

**Key Principle:** Private keys are NEVER stored on the server. All sensitive cryptographic operations happen client-side.

- **Wallet Generation:** Mnemonic phrases (12/24 words) generated in the user's browser/app
- **Key Storage:** Encrypted with user-provided passwords and stored locally (localStorage/Secure Enclave/Keystore)
- **Transaction Signing:** All transactions signed client-side before being sent to the server
- **Server Role:** Only broadcasts signed transactions to blockchain networks
- **Recovery:** Users backup their own mnemonic phrases - server only stores a hash for verification

### Multi-Chain Support

Supports multiple blockchain networks:
- **Solana** (primary focus for gambling)
- **Ethereum** and EVM-compatible chains (Polygon, Arbitrum, Optimism, Celo)
- **Bitcoin**

All chains use the same non-custodial architecture - unified user experience across blockchains.

## Primary Use Case: Solana Gambling Wallet

### Target Users

- Online casino players who use Solana (SOL) for deposits/withdrawals
- Crypto gamblers who want instant transactions
- Users who prefer non-custodial wallets for security

### Key Features for Gambling

1. **Instant Transactions**
   - Priority fee optimization ensures <2 second confirmations
   - Real-time balance updates via WebSocket
   - No stuck transactions when depositing to casinos

2. **Casino Integration**
   - One-click deposits to popular casinos (Roobet, Stake, Rollbit)
   - Transaction history automatically labels casino transactions
   - Win/loss detection from transaction metadata
   - Preset casino addresses for quick access

3. **User-Friendly Features**
   - Username system (`@username.sol`) - send to usernames instead of long addresses
   - Fiat on-ramp integration (buy SOL with credit card via MoonPay/Ramp)
   - Enriched transaction history (shows "Win from Stake: 5.0 SOL" instead of raw hashes)
   - Real-time SOL/USD price display

## Technical Stack

### Frontend
- **Framework:** Next.js 15 with React 19 and TypeScript
- **UI:** Tailwind CSS, custom components, mobile-first design
- **PWA:** Progressive Web App with service workers
- **Mobile:** Responsive design, optimized for mobile devices

### Backend
- **API:** Next.js API routes (RESTful)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Azure AD B2C integration
- **Storage:** Client-side encryption (Web Crypto API)

### Blockchain Integration
- **Solana:** @solana/web3.js, Solana Wallet Adapter
- **EVM Chains:** ethers.js
- **Bitcoin:** bitcoinjs-lib
- **RPC Providers:** Helius Enhanced API (Solana), QuickNode

### Third-Party Integrations
- **Fiat On-Ramp:** MoonPay, Ramp Network (no custody)
- **Transaction Data:** Helius Enhanced Transactions API
- **Price Data:** CoinGecko API
- **Telegram:** Bot integration and Mini App support

## Core Entities & Data Model

### User
- Authentication via Azure AD B2C
- Profile information (display name, username, phone)
- Security settings (2FA, preferences)
- Telegram integration (bot commands, notifications)
- Card preferences (virtual/physical)

### Wallet
- Multi-chain wallet addresses
- Public keys (NEVER private keys)
- Mnemonic hash (SHA-256 for recovery verification only)
- Balance cache (for performance)
- Wallet metadata (label, default status, hidden vaults)
- Multi-sig support (for enterprise users)

### Transaction
- Blockchain transaction records
- Transaction hash, block number, status
- Transfer details (from/to addresses, amounts)
- Fees (gas fees, priority fees)
- Token transfers (native and SPL tokens)
- Casino transaction labels and win/loss detection

### Card (Virtual/Physical Debit Cards)
- Linked to cryptocurrency wallets
- Card details (encrypted numbers, expiry)
- Spending limits and controls
- Merchant category code (MCC) filtering
- Country restrictions
- Cashback and rewards tracking
- Subscription management
- Provider integration (Stripe, Marqeta, etc.)

### Notification
- Multi-channel notifications (push, email, in-app, Telegram)
- Transaction alerts
- Security notifications
- System updates
- Deep linking support

### Other Features
- **Username System:** Map `@username.sol` to Solana addresses
- **Staking Positions:** Track staked assets and rewards
- **Scheduled Payments:** Recurring payment automation
- **Payment Requests:** Request payments from other users
- **Guardians:** Social recovery for wallets
- **Audit Logs:** Security event tracking
- **Rate Limiting:** API protection

## Security Model

### Non-Custodial Security
- No server-side private key storage
- Client-side encryption (AES-256-GCM)
- Password-based key derivation (PBKDF2)
- Local storage of encrypted mnemonics
- Recovery via mnemonic phrase backup

### Server-Side Security
- Azure AD B2C authentication
- Session management with MSAL tokens
- Rate limiting on API endpoints
- Idempotency keys for API requests
- Audit logging for security events
- CSRF protection

### Card Security
- PCI DSS compliance (encrypted card numbers)
- CVV never stored
- Advanced spending controls
- Fraud detection and alerts
- Geographic restrictions
- Merchant category filtering

## User Flows

### Wallet Creation
1. User generates 12/24-word mnemonic phrase (client-side)
2. User backs up mnemonic phrase securely
3. User sets password for encryption
4. Client derives Solana wallet from mnemonic
5. Client encrypts mnemonic with password
6. Client stores encrypted mnemonic locally
7. Server receives only public key and address
8. Server stores wallet metadata (no private keys)

### Sending Transaction
1. User enters recipient address/username
2. User enters amount and selects priority fee
3. Client decrypts mnemonic from local storage (requires password)
4. Client signs transaction with private key
5. Client sends signed transaction to server
6. Server broadcasts signed transaction to blockchain
7. Server updates transaction history

### Casino Deposit
1. User selects casino from preset list
2. User enters deposit amount
3. Transaction automatically uses "instant" priority fee
4. Client signs and broadcasts transaction
5. Balance updates in real-time via WebSocket
6. Transaction appears in history with casino label

### Fiat Purchase
1. User clicks "Buy SOL" in wallet
2. MoonPay/Ramp widget opens
3. User completes KYC and purchase
4. Crypto sent directly to user's non-custodial address
5. Celora never touches the funds
6. User sees SOL appear in wallet

## Regulatory Compliance

### Non-Custodial Benefits
- **Not a Money Transmitter:** Users control their own keys
- **No Custody:** No regulatory licensing required for crypto custody
- **Lower Liability:** Not responsible for user funds
- **Global Access:** Can serve users in most jurisdictions

### Compliance Features
- KYC handled by third-party fiat providers (MoonPay/Ramp)
- Transaction monitoring for AML purposes
- Audit logging for regulatory requirements
- User identity verification via Azure AD B2C

## Scalability & Performance

### Architecture Decisions
- Client-side signing reduces server load
- Balance caching for performance
- WebSocket subscriptions for real-time updates
- Connection pooling (PgBouncer) for database
- Rate limiting to prevent abuse

### Future Scaling
- Horizontal scaling (stateless API design)
- CDN for static assets
- Database read replicas
- Caching layer (Redis) for hot data
- Queue system for background jobs

## Monetization

1. **Transaction Fees:** Small percentage on fiat on-ramp transactions (via MoonPay/Ramp partnership)
2. **Premium Features:** Advanced wallet features, priority support
3. **Enterprise:** Multi-sig wallets, advanced security features
4. **Affiliate:** Casino partnerships (referral fees)

## Competitive Advantages

1. **Non-Custodial:** True user control, unlike custodial wallets
2. **Gambling-Focused:** Specialized features for casino players
3. **Instant Transactions:** Priority fees for fast confirmations
4. **User Experience:** Usernames, enriched history, one-click deposits
5. **Multi-Chain:** Unified experience across blockchains
6. **Telegram Integration:** Wallet access via Telegram bot

## Development Status

### Completed
- ✅ Non-custodial wallet architecture
- ✅ Solana wallet creation and management
- ✅ Transaction signing and broadcasting
- ✅ Casino deposit presets
- ✅ Username system
- ✅ Fiat on-ramp integration
- ✅ Transaction history with casino labels
- ✅ Telegram bot commands
- ✅ Telegram Mini App integration

### In Progress
- 🔄 UI component polish
- 🔄 Mobile responsive design improvements
- 🔄 Error handling enhancements

### Planned
- 📋 Virtual debit card issuance
- 📋 NFT support
- 📋 Advanced analytics
- 📋 Multi-sig wallet UI
- 📋 Social recovery UI



