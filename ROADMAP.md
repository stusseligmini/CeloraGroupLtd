# 🚀 NON-CUSTODIAL CELORA ROADMAP

**Version:** Phase 0 → Launch (8 weeks)  
**Philosophy:** "Feels custodial, but isn't" – All keys client-side, zero legal risk  
**Target:** Solana-first gambling wallet that ships FAST

---

## ✅ PHASE 0: Delete Custodial Code (DONE)

### What We Changed:
- ❌ Removed `mnemonicHash` from database schema
- ❌ Removed all server-side key storage
- ❌ Removed `encryptedPrivateKey` references
- ✅ Added **client-side key management** (`clientKeyManagement.ts`)
- ✅ Updated Prisma schema with non-custodial comments
- ✅ Wallet model now ONLY stores:
  - Public addresses
  - Balance cache
  - User preferences
  - Transaction history

### Architecture:
```
CLIENT (Browser/Mobile)          SERVER (Vercel + Neon)
┌───────────────────────┐       ┌──────────────────────┐
│ Seed Phrase (BIP39)   │──X──→ │ ❌ NEVER RECEIVES    │
│ Private Keys          │──X──→ │ ❌ NEVER STORES      │
│ Encrypted Local       │       │                      │
│ Storage Only          │       │ ✅ Public addresses  │
│                       │←──────│ ✅ Balance cache     │
│ Sign Transactions     │       │ ✅ Username mapping  │
│ Locally              │       │ ✅ Transaction history│
└───────────────────────┘       └──────────────────────┘
```

**Legal Risk:** **0%** 🎉

---

## 📅 PHASE 1: MVP Non-Custodial Wallet (Weeks 1-4)

### Week 1-2: Core Wallet Engine

**Goal:** User can create wallet, secure it, see balances

#### Tasks:
1. **Wallet Creation Flow** (`src/app/(wallet)/create/page.tsx`)
   - [x] Generate 12-word seed phrase (BIP39) ✅
   - [ ] Show seed phrase to user (copy/write down)
   - [ ] Confirm seed phrase (security check)
   - [ ] Set password/PIN
   - [ ] Encrypt seed phrase with password (AES-GCM)
   - [ ] Store encrypted seed LOCALLY (IndexedDB/SecureStorage)

2. **Wallet Import Flow** (`src/app/(wallet)/import/page.tsx`)
   - [ ] Enter existing seed phrase
   - [ ] Validate seed phrase (BIP39)
   - [ ] Derive all addresses (SOL, ETH, BTC)
   - [ ] Encrypt and store locally

3. **Key Derivation** (Already done in `clientKeyManagement.ts`)
   - [x] Solana: `m/44'/501'/0'/0'` ✅
   - [x] Ethereum: `m/44'/60'/0'/0/0` ✅
   - [x] Bitcoin: `m/44'/0'/0'/0/0` ✅
   - [x] Celo: `m/44'/52752'/0'/0/0` ✅

4. **RPC Integration** (`src/lib/blockchain/helius.ts`)
   - [ ] Set up Helius RPC (Solana)
   - [ ] WebSocket connection for real-time balance updates
   - [ ] Get balance (SOL + SPL tokens)
   - [ ] Get transaction history (Enhanced Transactions API)

### Week 3-4: Transaction Layer

**Goal:** Users can send/receive crypto

#### Tasks:
5. **Send Transaction** (`src/components/wallet/SendTransaction.tsx`)
   - [ ] Enter recipient address
   - [ ] Enter amount
   - [ ] Calculate fees
   - [ ] Ask for password
   - [ ] Decrypt seed phrase CLIENT-SIDE
   - [ ] Sign transaction CLIENT-SIDE
   - [ ] Broadcast to Solana network

6. **Receive** (`src/components/wallet/ReceiveAddress.tsx`)
   - [ ] Show QR code with address
   - [ ] Copy address button
   - [ ] WebSocket listener for incoming transactions

7. **Transaction History** (`src/app/(wallet)/history/page.tsx`)
   - [ ] Pull from Helius Enhanced API
   - [ ] Show: sent/received, amount, timestamp, status
   - [ ] Cache in server DB (public data only)

**Tech Stack:**
- Frontend: Next.js 15 + React
- Wallet Library: `@solana/web3.js` + `@solana/wallet-adapter`
- RPC: Helius (free tier: 100 req/sec)
- Storage: IndexedDB (browser) / SecureStorage (mobile)

---

## 📅 PHASE 2: "Feels Custodial" Magic (Weeks 5-6)

### Week 5: Username System (Internal Transfers)

**Goal:** `@dexter` sends to `@rogers` – feels instant & free

#### Tasks:
8. **Username Registration** (`src/app/api/username/route.ts`)
   - [ ] User picks username (`@dexter.sol`)
   - [ ] Server stores mapping:
     ```sql
     user_id → username → solana_address
     ```
   - [ ] Check username availability
   - [ ] Reserve username (unique constraint)

9. **Username Lookup** (`src/lib/username/resolver.ts`)
   - [ ] Input: `@rogers` → Output: `7xKXtg...` (Solana address)
   - [ ] Fallback: If not found, assume raw address

10. **Send to Username** (Update `SendTransaction.tsx`)
    - [ ] User enters: `@rogers` or `0.5 SOL`
    - [ ] Frontend resolves username → address
    - [ ] Signs transaction CLIENT-SIDE
    - [ ] Broadcasts to Solana (costs 0.000005 SOL)
    - [ ] User thinks it's "internal transfer" 🎩

### Week 6: Telegram Bot Integration

**Goal:** Send crypto directly from Telegram chat

#### Tasks:
11. **Telegram Mini App** (`src/app/telegram/page.tsx`)
    - [ ] Connect Telegram user ID to Celora account
    - [ ] Open wallet in Telegram WebView
    - [ ] Authentication via Telegram Web App API

12. **Telegram Bot Commands** (`src/app/api/telegram/webhook/route.ts`)
    - [ ] `/start` – Link Telegram to wallet
    - [ ] `/balance` – Show SOL balance
    - [ ] `/send @rogers 0.5` – Inline send (opens mini app)
    - [ ] `/receive` – Show QR code

**Tech Stack:**
- Telegram Bot API
- Telegram Web App SDK
- Vercel Edge Functions for webhook

---

## 📅 PHASE 3: Fiat On-Ramp & Cards (Weeks 7-8)

### Week 7: Buy Crypto with Credit Card

**Goal:** Users can buy SOL with Visa/Mastercard (we take 0.5% fee)

#### Tasks:
13. **MoonPay Widget Integration** (`src/components/fiat/MoonPayWidget.tsx`)
    - [ ] Embed MoonPay widget
    - [ ] Pre-fill user's Solana address
    - [ ] User completes KYC on MoonPay side
    - [ ] MoonPay sends SOL directly to user's wallet
    - [ ] We get revenue share (0.5-1%)

14. **Alternative: Ramp Network** (Backup option)
    - [ ] Ramp Network SDK
    - [ ] Same flow as MoonPay

**Legal:** **Zero risk** – MoonPay handles all compliance

### Week 8: Virtual Debit Card

**Goal:** Users can spend crypto anywhere (Visa/Mastercard)

#### Tasks:
15. **Jupiter Card Integration** (`src/components/card/JupiterCard.tsx`)
    - [ ] Embed Jupiter Card widget
    - [ ] User creates virtual card
    - [ ] User tops up card from their Solana wallet
    - [ ] Card works everywhere Visa works
    - [ ] We earn interchange fees

16. **Alternative: Kado Money Cards**
    - [ ] Kado Money API
    - [ ] Virtual card issuance

**Legal:** **Zero risk** – Card provider handles compliance

---

## 📅 PHASE 4: Gambling Sauce (Weeks 9-10)

### Week 9: One-Click Casino Deposits

**Goal:** "Send to Stake.com" button – instant deposit

#### Tasks:
17. **Casino Presets** (`src/lib/casinos/presets.ts`)
    - [ ] Store popular casino deposit addresses:
      - Stake.com (Solana)
      - Roobet (SOL/ETH)
      - Rollbit (SOL/USDC)
    - [ ] Pre-fill send form with casino address
    - [ ] Show SOL → USD conversion live

18. **Live Price Feed** (`src/lib/prices/coingecko.ts`)
    - [ ] CoinGecko API (free tier)
    - [ ] Show: "0.5 SOL = $54.32 USD"
    - [ ] Update every 30 seconds

### Week 10: Swap Integration (SOL ↔ USDC)

**Goal:** Gamblers swap SOL to USDC before depositing

#### Tasks:
19. **Jupiter Swap Integration** (`src/components/swap/JupiterSwap.tsx`)
    - [ ] Embed Jupiter Swap widget
    - [ ] SOL → USDC (and reverse)
    - [ ] Best price aggregation (Jupiter finds it)
    - [ ] Sign transaction CLIENT-SIDE

---

## 📅 PHASE 5: Polish & Ship (Weeks 11-12)

### Week 11: UI/UX Polish

**Goal:** Beautiful UI like Phantom but better

#### Tasks:
20. **Design System** (Already have Shadcn UI ✅)
    - [ ] Consistent colors, fonts, spacing
    - [ ] Dark mode (gambling vibes)
    - [ ] Loading states, animations
    - [ ] Toast notifications

21. **Onboarding Flow**
    - [ ] Welcome screen
    - [ ] "Create wallet" vs "Import wallet"
    - [ ] Security tips
    - [ ] Backup reminder

### Week 12: Security & Monitoring

**Goal:** Production-ready security

#### Tasks:
22. **Security Audit**
    - [ ] Code review (focus on key management)
    - [ ] Penetration testing
    - [ ] Check for key leakage

23. **Monitoring** (Vercel Analytics ✅)
    - [ ] Error tracking (Sentry optional)
    - [ ] Transaction monitoring
    - [ ] User analytics (privacy-focused)

24. **Backup Options**
    - [ ] iCloud encrypted backup (iOS)
    - [ ] Google Drive encrypted backup (Android)
    - [ ] Manual export seed phrase

---

## 🚀 LAUNCH CHECKLIST

- [ ] Prisma migrations deployed (Neon DB)
- [ ] All environment variables set (Vercel)
- [ ] Helius RPC configured
- [ ] Firebase Auth enabled
- [ ] MoonPay account created (get API keys)
- [ ] Jupiter Card integration tested
- [ ] Telegram bot deployed
- [ ] Chrome Extension published
- [ ] iOS TestFlight build
- [ ] Android Play Store beta
- [ ] Landing page (celora.net)
- [ ] Documentation (how to use)
- [ ] Support chat (Telegram community)

---

## 💰 MONETIZATION

**Revenue Streams (All Compliant):**
1. **Fiat On-Ramp Fee:** 0.5-1% on MoonPay purchases
2. **Card Interchange:** 0.5-2% on card transactions
3. **Swap Fee:** 0.1-0.3% on Jupiter swaps (optional)
4. **Premium Features:** $2.99/month for:
   - Priority support
   - Advanced analytics
   - Custom usernames

**Expected Revenue:**
- 1,000 active users × $10/month avg = **$10K/month**
- No custody = No license = **100% profit**

---

## 🛠️ TECH STACK (FINAL)

```
Frontend
├── Next.js 15 (App Router)
├── React 19
├── Tailwind CSS + Shadcn UI
├── Framer Motion (animations)
└── Vercel (hosting) [$0/month]

Blockchain
├── @solana/web3.js
├── @solana/wallet-adapter
├── bip39 (seed phrases)
├── ed25519-hd-key (key derivation)
└── Helius RPC [$0/month free tier]

Database
├── Neon PostgreSQL [$0/month]
├── Prisma ORM
└── Only public data (addresses, usernames, tx history)

Auth & Storage
├── Firebase Auth [$0/month]
├── Firestore (real-time) [$0/month]
├── Vercel Blob (NFT images) [$0/month]
└── IndexedDB (client-side encrypted keys)

Integrations
├── MoonPay (fiat on-ramp)
├── Jupiter Card (virtual cards)
├── Jupiter Swap (DEX aggregator)
├── Telegram Bot API
└── CoinGecko API (prices)
```

**Total Cost: $0-5/month** 🎉

---

## ✅ PROGRESS TRACKER

| Phase | Task | Status | ETA |
|-------|------|--------|-----|
| **Phase 0** | Delete custodial code | ✅ DONE | Nov 25 |
| **Phase 1** | Wallet creation UI | 🔄 IN PROGRESS | Week 1-2 |
| **Phase 1** | Transaction signing | ⏳ TODO | Week 3-4 |
| **Phase 2** | Username system | ⏳ TODO | Week 5 |
| **Phase 2** | Telegram bot | ⏳ TODO | Week 6 |
| **Phase 3** | Fiat on-ramp | ⏳ TODO | Week 7 |
| **Phase 3** | Virtual cards | ⏳ TODO | Week 8 |
| **Phase 4** | Casino presets | ⏳ TODO | Week 9 |
| **Phase 4** | Swap integration | ⏳ TODO | Week 10 |
| **Phase 5** | UI polish | ⏳ TODO | Week 11 |
| **Phase 5** | Security audit | ⏳ TODO | Week 12 |
| **Launch** | Production deploy | ⏳ TODO | Week 12 |

---

## 🎯 SUCCESS METRICS

**Week 4 (MVP):**
- [ ] 10 test users can create wallet
- [ ] 10 test transactions successful
- [ ] Zero key leakage incidents

**Week 8 (Beta):**
- [ ] 100 users signed up
- [ ] $1,000 fiat on-ramp volume
- [ ] 10 virtual cards issued

**Week 12 (Launch):**
- [ ] 1,000 users
- [ ] $10K fiat on-ramp volume
- [ ] $1K monthly revenue
- [ ] 99.9% uptime

---

## 🚨 RED FLAGS TO AVOID

❌ **DON'T:**
- Store private keys on server
- Store seed phrases (even encrypted)
- Custody user funds
- Promise "insurance" or "guarantees"
- Handle fiat directly
- Issue cards yourself

✅ **DO:**
- Generate keys CLIENT-SIDE only
- Use secure mobile storage (Keychain/Keystore)
- Partner for fiat/cards
- Be transparent about non-custodial nature
- Educate users about seed phrase security

---

**Last Updated:** November 25, 2025  
**Status:** Phase 0 Complete ✅ → Starting Phase 1  
**Next:** Build wallet creation UI (Week 1)
