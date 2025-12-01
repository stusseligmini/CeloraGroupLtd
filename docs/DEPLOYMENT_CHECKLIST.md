# 🚀 Celora Deployment Checklist

## ✅ COMPLETED

### Security & Bot Protection
- [x] reCAPTCHA Enterprise implementation (2 layers)
  - [x] Manual assessments for custom logic
  - [x] Firebase App Check for Firebase resources
- [x] API keys configured
  - Site Key: `6Lc3DR4sAAAALSoFmgh9mWjmTeQ8GEfAqPjsQYZ`
  - Secret Key: `6Lc3DR4sAAAAACtkkins-KKhXMLDTYhJswozlJ44`
  - Added to `functions/.env` ✅
  - Added to `.env.local` ✅
- [x] Helius API key secured (server-side only)
- [x] Firebase configuration complete
- [x] Firestore rules updated with App Check

### Frontend Features
- [x] Toast system (react-hot-toast)
- [x] Theme system (light/dark mode)
- [x] Onboarding flow (WelcomeScreen, CreateVsImportChoice)
- [x] Security components (DevToolsWarning, SecurityTips, BackupReminder)
- [x] Transaction history with Helius Enhanced API
- [x] TypeScript errors: 74 → 0

### Deployment
- [x] Firebase Hosting + Functions setup
- [x] Next-on-Firebase adapter (no Docker)
- [x] Static asset caching (1-year TTL)
- [x] Security headers (X-Frame-Options, CSP-ready)
- [x] First deployment successful: https://celora-7b552.web.app
- [x] Environment variables secured

---

## ⏳ TODO (Before Production)

### 1. Firebase App Check Registration (5 minutes)
**REQUIRED for App Check to work**

1. Go to: https://console.firebase.google.com/project/celora-7b552/appcheck
2. Click **"Get Started"** or **"Apps"**
3. Select your **Web** app
4. Choose **"reCAPTCHA Enterprise"** as provider
5. Enter site key: `6Lc3DR4sAAAALSoFmgh9mWjmTeQ8GEfAqPjsQYZ`
6. Click **"Save"**

**Why**: Without this, App Check won't protect your Firestore/Functions.

---

### 2. Deploy Updated Configuration (5 minutes)

```bash
# Build with reCAPTCHA keys
npm run build

# Deploy to Firebase
npm run firebase:deploy
```

**What this deploys**:
- ✅ Updated Firestore rules (with App Check)
- ✅ Functions with reCAPTCHA secret key
- ✅ App Check initialization in client code

---

### 3. Verify Deployment (10 minutes)

#### Test 1: App Check
```typescript
// Open browser console at: https://celora-7b552.web.app
// Should see: "✅ Firebase App Check initialized"
```

#### Test 2: reCAPTCHA Script Loading
```typescript
// Check browser console for:
// - reCAPTCHA script loaded
// - No errors about missing site key
```

#### Test 3: API Routes
```bash
# Test verify endpoint
curl -X POST https://celora-7b552.web.app/api/recaptcha/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"test","action":"login"}'

# Should return: {"success":false,"score":0,...} (expected - test token)
```

#### Test 4: Firestore Write (Should Work)
```typescript
// Try creating a wallet or any write operation
// Should succeed with App Check token attached
```

---

### 4. Add reCAPTCHA to Critical Flows (30 minutes)

Choose ONE approach per flow:

#### Approach A: Wrap Component (Easiest)
```tsx
// Example: Protect wallet creation
import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';

export default withRecaptchaProtection(CreateSolanaWallet, {
  action: 'wallet_create',
  minScore: 0.7,
});
```

#### Approach B: Manual Verification (More Control)
```tsx
// Example: Protect transaction
const { executeRecaptcha } = useRecaptcha();

const handleSend = async () => {
  const result = await executeAndVerifyRecaptcha(executeRecaptcha, 'transaction');
  if (!result.success || result.score < 0.5) {
    toast.error('Security check failed');
    return;
  }
  // Proceed...
};
```

**Priority List**:
1. **HIGH** (minScore: 0.7):
   - [ ] Wallet creation (`src/app/wallet/create/page.tsx`)
   - [ ] Wallet import (`src/app/wallet/import/page.tsx`)

2. **MEDIUM** (minScore: 0.5):
   - [ ] Send SOL (`src/components/solana/SendSolana.tsx`)
   - [ ] Jupiter swaps (`src/components/solana/JupiterSwap.tsx`)
   - [ ] Login/signup (if you have dedicated auth pages)
   - [ ] Username registration (`src/app/wallet/register-username/page.tsx`)

3. **LOW** (minScore: 0.3):
   - [ ] Telegram linking (`src/app/link-telegram/page.tsx`)

**See examples in**: `docs/examples/recaptcha-*.tsx`

---

### 5. Optional: WAF Firewall Policies (10 minutes)

Create automated blocking rules:

1. Go to: https://console.cloud.google.com/security/recaptcha/firewallpolicies?project=celora-7b552
2. Click **"Create Policy"**

**Example Policy 1: Block Bots**
- Name: `block-low-scores`
- Condition: `reCAPTCHA score < 0.3`
- Action: **Block**

**Example Policy 2: Challenge Suspicious**
- Name: `challenge-suspicious`
- Condition: `reCAPTCHA score >= 0.3 AND score < 0.5`
- Action: **Challenge** (show CAPTCHA)

**Example Policy 3: Rate Limit**
- Name: `rate-limit-bots`
- Condition: `reCAPTCHA score < 0.5 AND requests > 10/min`
- Action: **Throttle**

---

### 6. Monitoring Setup (5 minutes)

#### Enable Firebase App Check Metrics
1. Go to: https://console.firebase.google.com/project/celora-7b552/appcheck
2. Check **"Token verification metrics"**
3. Review failed attempts

#### Enable reCAPTCHA Dashboard
1. Go to: https://console.cloud.google.com/security/recaptcha?project=celora-7b552
2. View **score distribution**
3. Check **actions breakdown**

#### Set Up Alerts (Optional)
- Alert if App Check verification rate < 95%
- Alert if reCAPTCHA score average < 0.5
- Alert if WAF blocks > 1000/hour

---

## 🔧 NICE TO HAVE (Post-Launch)

### Performance
- [ ] Add Sentry for error tracking
  - [ ] Get Sentry DSN
  - [ ] Add to `functions/.env`: `SENTRY_DSN=...`
  - [ ] Initialize in `src/app/layout.tsx`

### Database
- [ ] Set up PostgreSQL production database
  - Update `DATABASE_URL` in environment
  - Run migrations: `npx prisma migrate deploy`

### Mobile
- [ ] Complete React Native mobile app
  - [ ] Expo configuration
  - [ ] iOS/Android builds
  - [ ] App Store submission

### Virtual Cards
- [ ] Integrate card issuing provider
  - [ ] Highnote API keys
  - [ ] OR Gnosis Pay API keys
  - [ ] KYC flow implementation

### Advanced Features
- [ ] GraphQL API (partially implemented)
- [ ] Hidden Vault (code exists, needs testing)
- [ ] Casino integration (code exists, needs provider)

---

## 🎯 IMMEDIATE NEXT STEPS (Next 30 Minutes)

### Step 1: Register App Check (5 min)
Go to Firebase Console → App Check → Register app with reCAPTCHA Enterprise

### Step 2: Deploy (5 min)
```bash
npm run build && npm run firebase:deploy
```

### Step 3: Test (10 min)
- Visit https://celora-7b552.web.app
- Check browser console for "✅ Firebase App Check initialized"
- Try creating a wallet (should work)
- Try a Firestore write (should work)

### Step 4: Add reCAPTCHA to Wallet Creation (10 min)
Edit `src/app/wallet/create/page.tsx`:
```tsx
import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';
import { CreateSolanaWallet } from '@/components/solana/CreateSolanaWallet';

const Protected = withRecaptchaProtection(CreateSolanaWallet, {
  action: 'wallet_create',
  minScore: 0.7,
});

export default function WalletCreatePage() {
  return <div className="container mx-auto py-8"><Protected /></div>;
}
```

Then redeploy:
```bash
npm run build && npm run firebase:deploy
```

---

## 📊 What You Have vs. What You Need

| Feature | Status | Priority |
|---------|--------|----------|
| Firebase Hosting | ✅ Live | - |
| Firebase Functions | ✅ Live | - |
| Helius API (secured) | ✅ Done | - |
| reCAPTCHA Enterprise (configured) | ✅ Done | - |
| Firebase App Check (code) | ✅ Done | - |
| **App Check Registration** | ❌ TODO | 🔴 HIGH |
| **Deploy with keys** | ❌ TODO | 🔴 HIGH |
| **Add reCAPTCHA to flows** | ❌ TODO | 🟡 MEDIUM |
| WAF Firewall Policies | ⏳ Optional | 🟢 LOW |
| Sentry Integration | ⏳ Optional | 🟢 LOW |
| Production Database | ⏳ Optional | 🟢 LOW |

---

## 🚨 Critical Path to Production

**You MUST complete** (30 min total):
1. ✅ App Check registration (5 min)
2. ✅ Deploy with reCAPTCHA keys (5 min)
3. ✅ Test deployment (10 min)
4. ✅ Add reCAPTCHA to wallet creation (10 min)

**Everything else is optional** and can be done post-launch.

---

## 📚 Documentation Reference

- **Quick Start**: `docs/RECAPTCHA_QUICKSTART.md`
- **Complete Guide**: `docs/RECAPTCHA_COMPLETE_IMPLEMENTATION.md`
- **App Check + WAF**: `docs/FIREBASE_APP_CHECK_SETUP.md`
- **Integration Examples**: `docs/examples/`

---

## 💰 Current Monthly Costs

| Service | Cost |
|---------|------|
| Firebase (Spark Plan) | **$0** (free tier) |
| reCAPTCHA Enterprise | **$0-5** (10k free, then $1/1k) |
| Helius RPC | **$0-50** (depending on usage) |
| Cloud Armor (WAF) | **$3-5** (if enabled) |
| **TOTAL** | **~$3-60/month** |

---

## ✅ Success Criteria

Your deployment is **production-ready** when:

- [x] Site loads at https://celora-7b552.web.app
- [ ] App Check shows "initialized" in console
- [ ] Wallet creation works
- [ ] Transactions work
- [ ] reCAPTCHA verification shows in network tab
- [ ] No errors in browser console
- [ ] Firestore writes succeed (with App Check)

**After 4 items above = READY TO LAUNCH** 🚀
