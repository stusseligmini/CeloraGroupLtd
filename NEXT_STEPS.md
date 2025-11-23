# Next Steps - Building UI Components

## Current Status

**Backend:** ✅ All APIs working (wallet creation, sending, history, usernames, swaps)  
**Infrastructure:** ✅ Non-custodial architecture complete, Solana libraries built  
**UI Components:** ⚠️ Basic components exist, but missing Solana-specific gambling wallet UI

---

## Priority 1: Core Solana Wallet UI (Week 1)

### 1. Solana Wallet Creation UI
**File:** `src/components/solana/CreateSolanaWallet.tsx`

**What it needs to do:**
- Show mnemonic phrase generation (12/24 words)
- Let user copy/backup mnemonic phrase securely
- Set password for encrypting mnemonic
- Derive Solana wallet from mnemonic
- Create wallet via `/api/wallet/create`
- Store encrypted mnemonic in localStorage
- Show wallet address and QR code

**Key features:**
- Step-by-step wizard (generate → backup → password → confirm)
- "Reveal mnemonic" toggle with warning
- Copy to clipboard functionality
- Password strength indicator
- Address display with copy button

### 2. Solana Wallet Dashboard
**File:** `src/components/solana/SolanaWalletDashboard.tsx`

**What it needs to do:**
- Display SOL balance (from `/api/solana/balance`)
- Real-time balance updates (WebSocket subscription)
- Quick send/receive buttons
- Transaction history preview
- Casino deposit quick access

**Key features:**
- Balance in SOL and USD
- Live price updates
- Recent transactions (last 5)
- Quick actions (Send, Receive, Buy, Casino)

### 3. Transaction History with Casino Labels
**File:** `src/components/solana/TransactionHistory.tsx`

**What it needs to do:**
- Fetch enriched history from `/api/solana/history`
- Display transactions with casino labels
- Show win/loss indicators
- Filter by type (all, deposits, withdrawals, wins)
- Link to Solscan/Explorer

**Key features:**
- Enriched labels ("Win from Roobet: 5.0 SOL")
- Win/loss badges (green for wins, red for losses)
- Date/time formatting
- Transaction status (confirmed, pending)
- Expandable details

### 4. Send SOL Interface
**File:** `src/components/solana/SendSolana.tsx`

**What it needs to do:**
- Send to address or username (`@username.sol`)
- Amount input with SOL/USD toggle
- Priority fee selector (low/normal/high/instant)
- Transaction preview before signing
- Client-side signing via `transactionSigning.ts`
- Broadcast via `/api/solana/send`
- Transaction status tracking

**Key features:**
- Address/username input with validation
- Amount input with max button
- Priority fee recommendation
- "Instant" mode for gambling
- Transaction confirmation modal
- Success/error notifications

---

## Priority 2: Casino Features (Week 2)

### 5. Casino Deposit Interface
**File:** `src/components/solana/CasinoDeposit.tsx`

**What it needs to do:**
- Show casino presets from `casinoPresets.ts`
- One-click deposit to popular casinos
- Custom casino address input
- Amount input with SOL/USD
- Instant confirmation mode

**Key features:**
- Casino list (Roobet, Stake, Rollbit, etc.)
- Search/filter casinos
- Verified badge for preset addresses
- Custom address option
- Quick amount buttons (0.1, 0.5, 1.0 SOL)

### 6. Username Send/Receive Interface
**File:** `src/components/solana/UsernameTransfer.tsx`

**What it needs to do:**
- Register `@username.sol` via `/api/username`
- Send to username (resolve address first)
- Show username balance (optional)
- Username lookup/verification

**Key features:**
- Username registration form
- Username availability check
- Send to `@username.sol` input
- Resolve username before sending
- Username profile display

---

## Priority 3: Fiat Integration (Week 2-3)

### 7. Fiat Buy Widget Integration
**File:** `src/components/solana/BuySolana.tsx`

**What it needs to do:**
- Integrate MoonPay widget
- Show Ramp Network option
- Display user's Solana address
- Handle transaction callbacks
- Show purchase status

**Key features:**
- Provider selection (MoonPay/Ramp)
- Address display/confirmation
- Purchase amount input
- Status tracking
- Transaction completion notification

---

## Implementation Order

### Week 1: Core Wallet Experience
1. ✅ **Solana Wallet Creation UI** - Users can create wallets
2. ✅ **Solana Wallet Dashboard** - Users can see balance
3. ✅ **Transaction History** - Users can see their transactions
4. ✅ **Send SOL Interface** - Users can send SOL

### Week 2: Gambling Features
5. ✅ **Casino Deposit Interface** - One-click casino deposits
6. ✅ **Username Send/Receive** - Send to usernames

### Week 3: Polish & Integration
7. ✅ **Fiat Buy Widget Integration** - Buy SOL with credit card
8. ✅ **Error handling & loading states**
9. ✅ **Mobile responsive design**
10. ✅ **Testing & bug fixes**

---

## Quick Start: First Component

Let's start with **Solana Wallet Creation UI** since that's the entry point:

**File:** `src/components/solana/CreateSolanaWallet.tsx`

**Steps:**
1. Import `nonCustodialWallet.ts` functions
2. Generate mnemonic on component mount
3. Show mnemonic in secure reveal component
4. Password input with strength indicator
5. Derive Solana wallet from mnemonic
6. Call `/api/wallet/create` with public key
7. Store encrypted mnemonic in localStorage
8. Redirect to wallet dashboard

**Dependencies needed:**
- React hooks (`useState`, `useEffect`)
- Existing UI components (`Button`, `Input`, `Card`)
- `src/lib/wallet/nonCustodialWallet.ts`
- `src/app/api/wallet/create/route.ts` (already exists)

---

## What You Have vs. What You Need

### ✅ What You Have:
- All backend APIs working
- Non-custodial wallet libraries
- Solana libraries (wallet, Helius API, priority fees, casino presets)
- Basic UI components (Button, Input, Card, etc.)
- Wallet overview component (but not Solana-specific)
- App shell/layout

### 🔨 What You Need:
- Solana wallet creation UI
- Solana wallet dashboard
- Transaction history with casino labels
- Send SOL interface
- Casino deposit interface
- Username send/receive interface
- Fiat buy widget integration

---

## Next Step: Build CreateSolanaWallet Component

Should I start building the **CreateSolanaWallet** component now? This will let users:
1. Generate a mnemonic phrase
2. Backup their phrase securely
3. Set a password
4. Create their Solana wallet
5. Start using the wallet

Let me know if you want me to start with this component!

