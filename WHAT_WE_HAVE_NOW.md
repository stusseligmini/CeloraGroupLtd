# Celora - What We Have Now

## Current Status: Non-Custodial Multi-Chain Wallet (Solana-Focused for Gambling)

---

## Core Architecture

### Non-Custodial Wallet System

Private keys never stored on server - fully client-side, encrypted with user passwords. All transactions signed client-side, server only broadcasts. Users backup their own mnemonic phrases.

### Multi-Chain Support

Supports Ethereum, Celo, Polygon, Arbitrum, Optimism, Bitcoin, and Solana. Currently focused on Solana for gambling use case. All chains use the same non-custodial architecture.

---

## Solana Gambling Wallet Features

### 1. Solana Wallet Library (`src/lib/solana/solanaWallet.ts`)
Generates wallets from mnemonic phrases, derives HD wallet paths (BIP-44), sends SOL with priority fees for instant confirmation. Real-time balance updates via WebSocket. All transactions signed client-side.

### 2. Helius Enhanced API Integration (`src/lib/solana/heliusApi.ts`)
Enriched transaction history with labels instead of raw hashes. Automatically detects casino deposits/withdrawals and identifies wins/losses. Users see "Win from Roobet: 5.0 SOL" instead of transaction hashes.

### 3. Priority Fee Optimization (`src/lib/solana/priorityFees.ts`)
Analyzes network congestion and dynamically estimates fees. "Instant" mode for gambling uses 95th percentile fee plus 20% buffer to ensure immediate confirmation. No stuck transactions.

### 4. Casino Preset System (`src/lib/solana/casinoPresets.ts`)
One-click deposits to popular casinos like Roobet and Stake. Users select from a verified list instead of copy-pasting addresses. Supports custom presets and category filtering.

### 5. Username/Payname System (`src/app/api/username/route.ts`)
Users register `@username.sol` usernames. Sending to a username resolves to the actual Solana address and sends a normal on-chain transaction (costs ~0.000005 SOL, basically free). Feels like an internal transfer but it's just a cheap Solana transaction. Fully non-custodial.

### 6. Fiat On-Ramp Integration (`src/lib/fiat/moonpay.ts`, `src/lib/fiat/ramp.ts`, `src/components/fiat/MoonPayWidget.tsx`)
MoonPay and Ramp Network widgets integrated. Users buy SOL with credit card directly in the wallet. Crypto goes straight to user's non-custodial wallet - we never touch it. Widget providers handle KYC and compliance.

---

## APIs Built (All Non-Custodial)

### Solana APIs
- **GET /api/solana/balance?address=...** - Get SOL balance (returns SOL and lamports)
- **GET /api/solana/history?address=...** - Enriched transaction history with casino labels via Helius
- **POST /api/solana/send** - Send SOL with instant confirmation (client signs, server broadcasts)

### Username APIs
- **POST /api/username** - Register `@username.sol` (links username to Solana address)
- **GET /api/username?username=dexter** - Resolve username to address

### Wallet APIs
- **POST /api/wallet/create** - Create wallet (client generates keys, only sends public key)
- **POST /api/wallet/import** - Import wallet from mnemonic (server stores hash only)
- **POST /api/wallet/send** - Send transaction (multi-chain, client signs, server broadcasts)

### Swap APIs
- **POST /api/swap** - Token swap (Jupiter for Solana, 1inch for EVM chains, client signs)

---

## Database Schema

Removed `encryptedPrivateKey` and `encryptedMnemonic` columns. Added `mnemonicHash` (SHA-256 hash) for recovery verification only. Wallet table now only stores: address, publicKey, and mnemonicHash. Private keys never stored on server.

Migration SQL ready in `prisma/migrations/20251123_non_custodial_migration/migration.sql`. Prisma client regenerated.

---

## Client-Side Libraries

### 1. Non-Custodial Wallet Library (`src/lib/wallet/nonCustodialWallet.ts`)
Generates mnemonic phrases (12/24 words), derives wallets for multiple blockchains, handles client-side encryption with Web Crypto API. Users set password, mnemonic encrypted locally. Utilities for local storage and mnemonic hashing.

### 2. Transaction Signing Library (`src/lib/wallet/transactionSigning.ts`)
All signing happens client-side. Supports EVM chains (Ethereum, Celo, Polygon, Arbitrum, Optimism), Solana, and Bitcoin. Server only receives signed transactions for broadcasting.

### 3. Solana Wallet Library (`src/lib/solana/solanaWallet.ts`)
Solana-specific functions: wallet derivation, priority fee optimization, real-time balance subscriptions (WebSocket), casino transaction support.

---

## React Components

### 1. Solana Wallet Provider (`src/components/solana/SolanaWalletProvider.tsx`)
Wraps Solana Wallet Adapter. Supports Phantom, Solflare, Ledger, Torus. Auto-connect enabled.

### 2. MoonPay Widget (`src/components/fiat/MoonPayWidget.tsx`)
Embeddable widget for buying crypto with credit card. Crypto goes directly to user's Solana address. Widget handles KYC and compliance.

---

## Key Features for Gambling

**Instant Transactions** - Priority fees ensure instant confirmation. No stuck transactions for casino deposits. Real-time balance updates when users win.

**Casino Integration** - One-click deposits to Roobet, Stake, Rollbit. Transaction history automatically labels casino transactions ("Deposit to Roobet: 0.5 SOL") and detects wins/losses ("Win from Stake: 5.0 SOL").

**User-Friendly** - Send to `@username.sol` instead of addresses. Fiat on-ramp built into wallet. Readable transaction history with proper labels.

**Non-Custodial** - All keys encrypted client-side with user password. Server never sees private keys. Not a money transmitter = no regulatory issues. Users lose password = lost wallet (tradeoff for true non-custodial).

---

## Dependencies Installed

**Wallet & Blockchain:** `bip39`, `@scure/bip32`, `@scure/bip39`, `@noble/hashes`, `@solana/web3.js`, `@solana/wallet-adapter-*`, `@solana/spl-token`

**Existing:** `ethers` (EVM chains), `bitcoinjs-lib` (Bitcoin), plus other blockchain libraries

---

## What Works Right Now

**Create Wallets** - Generate mnemonic client-side, derive Solana wallet, encrypt with password, store locally. Server only gets public key/address.

**Send Transactions** - Sign client-side, send signed transaction to server, server broadcasts. Instant confirmation with priority fees.

**View History** - Helius Enhanced API provides enriched data with casino labels. Real-time balance updates via WebSocket.

**Use Usernames** - Register `@username.sol`, link to Solana address. Send to username = normal cheap Solana transaction.

**Buy Crypto** - MoonPay/Ramp widgets integrated. Buy SOL with credit card, crypto goes directly to non-custodial wallet. Widgets handle KYC.

---

## What Still Needs Work

### UI Components (Next Step)
- Solana wallet creation UI (show mnemonic, backup, set password)
- Transaction history page with casino labels
- Casino deposit interface with one-click presets
- Username send/receive interface
- Fiat buy widget integration

### Telegram Integration (Pending)
- Telegram Mini App setup
- Bot commands (`/send @dexter 0.5 SOL`)
- Deep linking from Telegram chats

### Services That Need Refactoring
- Multi-sig service (still references encrypted keys)
- Recovery service (still references encrypted keys)

### Polish (Future)
- Beautiful UI (Phantom-inspired)
- Push notifications
- Encrypted backup (iCloud/Google Drive)
- App Store submission

---

## File Structure

**Libraries:** `src/lib/wallet/` (non-custodial wallet, transaction signing), `src/lib/solana/` (wallet functions, Helius API, priority fees, casino presets), `src/lib/fiat/` (MoonPay, Ramp)

**Components:** `src/components/solana/` (Wallet Provider), `src/components/fiat/` (MoonPay Widget)

**APIs:** `src/app/api/wallet/` (create, import, send), `src/app/api/solana/` (balance, history, send), `src/app/api/username/` (username system), `src/app/api/swap/` (token swaps)

**Database:** `prisma/schema.prisma` (updated), `prisma/migrations/20251123_non_custodial_migration/` (migration SQL)

---

## Core Features Summary

**What Works:** Create non-custodial Solana wallets, send SOL with instant confirmation, view enriched transaction history with casino labels, use usernames (`@username.sol`), buy crypto with credit card, one-click casino deposits.

**What's Missing:** UI components (React), Telegram integration (Mini App + bot commands), polish (UI design, notifications, backup, App Store prep).

---

## Tech Stack

**Frontend:** Next.js 15 + React 19 + TypeScript  
**Blockchain:** Solana Web3.js, Ethers.js (EVM), Bitcoin.js  
**Wallet:** Solana Wallet Adapter + custom non-custodial encryption  
**RPC:** Helius Enhanced API (enriched transaction history)  
**Fiat:** MoonPay, Ramp Network (no custody)  
**Database:** PostgreSQL + Prisma (public keys only)  
**Storage:** LocalStorage/Secure Enclave/Keystore (client-side)

---

## Bottom Line

**We have:** Full non-custodial architecture, Solana gambling wallet with instant transactions, casino integration, username system, fiat on-ramp, all core APIs working.

**We need:** UI components, Telegram integration, polish and testing.

**Next step:** Build UI components - backend is solid, just need to make it look good and easy to use.

