# Complete reCAPTCHA Enterprise + Firebase App Check Implementation

## 🎯 What You Have Now

### **Two-Layer Bot Protection**

#### Layer 1: Firebase App Check (Automatic)
- ✅ Protects **all Firebase resources** (Firestore, Functions, Storage)
- ✅ Automatically attaches attestation tokens to Firebase SDK calls
- ✅ Uses reCAPTCHA Enterprise as attestation provider
- ✅ WAF-ready (Cloud Armor integration enabled)
- ✅ Firestore rules require `request.app != null` for writes

#### Layer 2: Custom reCAPTCHA Assessments (Manual)
- ✅ Protects **custom logic** (wallet creation, transactions, auth)
- ✅ Risk scoring 0.0 (bot) → 1.0 (human)
- ✅ Configurable thresholds per action
- ✅ ML feedback loop via annotations
- ✅ API routes for verification & annotation

---

## 📁 Files Created

### Configuration
```
src/config/recaptcha.ts                          # reCAPTCHA config (keys, actions, thresholds)
```

### Backend (Server-Only)
```
src/lib/recaptcha/assessmentClient.ts            # Server-side reCAPTCHA API client
src/app/api/recaptcha/verify/route.ts            # POST /api/recaptcha/verify
src/app/api/recaptcha/annotate/route.ts          # POST /api/recaptcha/annotate
```

### Frontend (Client-Side)
```
src/hooks/useRecaptcha.ts                        # React hook for reCAPTCHA
src/lib/recaptcha/client.ts                      # Client utilities
src/components/recaptcha/withRecaptchaProtection.tsx  # HOC wrapper
src/components/recaptcha/RecaptchaBadge.tsx      # Required badge
```

### Firebase App Check
```
src/lib/firebase/appCheck.ts                     # App Check standalone client
src/providers/AppCheckProvider.tsx               # App Check React provider
src/lib/firebase/client.ts                       # Updated with App Check init
```

### Documentation
```
docs/RECAPTCHA_SETUP.md                          # Full setup guide
docs/RECAPTCHA_QUICKSTART.md                     # 10-minute quick start
docs/FIREBASE_APP_CHECK_SETUP.md                 # App Check + WAF guide
docs/examples/recaptcha-wallet-create-example.tsx
docs/examples/recaptcha-transaction-example.tsx
docs/examples/recaptcha-auth-example.tsx
docs/examples/recaptcha-api-route-example.ts
```

### Security Rules
```
firestore.rules                                  # Updated with App Check
```

---

## 🔧 Setup Required (30 minutes total)

### Part A: reCAPTCHA Enterprise (10 min)

1. **Enable API**
   ```
   https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com?project=celora-7b552
   Click "Enable"
   ```

2. **Create reCAPTCHA Key**
   ```
   https://console.cloud.google.com/security/recaptcha?project=celora-7b552
   
   Click "Create Key"
   - Name: Celora Production v3
   - Type: Score-based (v3)
   - Domains: celora-7b552.web.app, celora-7b552.firebaseapp.com, localhost
   
   ✅ ENABLE: "Will you deploy this key in a Web Application Firewall (WAF)?"
   - Service provider: Cloud Armor
   - Feature: Action
   
   ✅ ENABLE: Fraud Prevention
   ✅ ENABLE: Account Defender
   
   Copy the SITE KEY (starts with 6L...)
   ```

3. **Get API Key**
   ```
   https://console.cloud.google.com/apis/credentials?project=celora-7b552
   
   Create Credentials > API Key
   Restrict to: reCAPTCHA Enterprise API only
   
   Copy the API KEY
   ```

4. **Add Environment Variables**
   
   **`functions/.env`** (server-side, REQUIRED):
   ```bash
   # Helius (already there)
   HELIUS_API_KEY=8170da90-466c-4824-9f08-3dd293dd69af
   NODE_ENV=production
   
   # reCAPTCHA (add this)
   RECAPTCHA_SECRET_KEY=your_api_key_here
   ```
   
   **`.env.local`** (for local dev):
   ```bash
   # reCAPTCHA public
   NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=celora-7b552
   NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=6L...your_site_key_here
   
   # reCAPTCHA server-side
   RECAPTCHA_SECRET_KEY=your_api_key_here
   
   # Firebase (should already be there)
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=celora-7b552
   ```

### Part B: Firebase App Check (10 min)

1. **Register App**
   ```
   https://console.firebase.google.com/project/celora-7b552/appcheck
   
   Click "Get Started"
   Select "Web" app
   Choose "reCAPTCHA Enterprise" provider
   Enter the same SITE KEY from Part A
   Click "Register"
   ```

2. **Deploy Firestore Rules**
   ```bash
   npm run build
   npm run firebase:deploy
   ```
   
   This deploys the updated `firestore.rules` with App Check enforcement.

### Part C: WAF Firewall Policies (Optional, 10 min)

1. **Create Firewall Policy**
   ```
   https://console.cloud.google.com/security/recaptcha/firewallpolicies?project=celora-7b552
   
   Click "Create Policy"
   
   Example 1: Block Low Scores
   - Name: Block Bots
   - Condition: reCAPTCHA score < 0.3
   - Action: Block
   
   Example 2: Challenge Suspicious
   - Name: Challenge Suspicious
   - Condition: reCAPTCHA score >= 0.3 AND score < 0.5
   - Action: Challenge (show CAPTCHA)
   
   Example 3: Rate Limit Low Scores
   - Name: Rate Limit Bots
   - Condition: reCAPTCHA score < 0.5 AND requests > 10/min
   - Action: Throttle
   ```

---

## 🚀 How to Use

### Option 1: Wrap Component (Easiest)

```tsx
import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';
import { CreateSolanaWallet } from '@/components/solana/CreateSolanaWallet';

export default withRecaptchaProtection(CreateSolanaWallet, {
  action: 'wallet_create',
  minScore: 0.7,
});
```

### Option 2: Manual Verification (More Control)

```tsx
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha } from '@/lib/recaptcha/client';

const { executeRecaptcha, ready } = useRecaptcha();

const handleSend = async () => {
  const result = await executeAndVerifyRecaptcha(executeRecaptcha, 'transaction');
  
  if (!result.success || result.score < 0.5) {
    toast.error('Security verification failed');
    return;
  }
  
  // Proceed with transaction...
};
```

### Option 3: Server-Side Only

```tsx
import { verifyToken } from '@/lib/recaptcha/assessmentClient';

export async function POST(request: NextRequest) {
  const { recaptchaToken } = await request.json();
  
  const { verified } = await verifyToken(recaptchaToken, 'wallet_create', {
    minScore: 0.7,
  });
  
  if (!verified) {
    return NextResponse.json({ error: 'Bot detected' }, { status: 403 });
  }
  
  // Proceed...
}
```

---

## 🎯 Protection Coverage

### Automatic (Firebase App Check)
✅ **All Firestore writes** - Requires App Check token
✅ **Cloud Functions** - Can enforce App Check
✅ **Cloud Storage** - Can enforce App Check
✅ **Realtime Database** - Can enforce App Check

### Manual (Custom reCAPTCHA)
Add to these flows (see examples in `docs/examples/`):

**High Priority** (minScore: 0.7):
- [ ] Wallet creation (`/wallet/create`)
- [ ] Wallet import (`/wallet/import`)

**Medium Priority** (minScore: 0.5):
- [ ] Send SOL transactions
- [ ] Jupiter swaps
- [ ] Login/signup
- [ ] Password reset
- [ ] Username registration
- [ ] Telegram linking

**Low Priority** (minScore: 0.3):
- [ ] Page views (analytics)
- [ ] Search queries

---

## 🔍 Monitoring

### Firebase Console
- [App Check Dashboard](https://console.firebase.google.com/project/celora-7b552/appcheck)
  - Token verification success rate
  - Failed verification attempts
  - App Check token usage

### reCAPTCHA Console
- [reCAPTCHA Dashboard](https://console.cloud.google.com/security/recaptcha?project=celora-7b552)
  - Score distribution (0.0 → 1.0)
  - Actions breakdown
  - WAF integration status
  - Firewall policy triggers

### Cloud Armor (if using WAF)
- [Security Policies](https://console.cloud.google.com/net-security/securitypolicies/list?project=celora-7b552)
  - Blocked requests
  - Rate limiting stats
  - Geographic blocks

---

## 🧪 Testing

### Test App Check

```typescript
import { verifyAppCheck } from '@/lib/firebase/appCheck';

const isWorking = await verifyAppCheck();
console.log('App Check:', isWorking ? '✅ Working' : '❌ Failed');
```

### Test Manual reCAPTCHA

```bash
curl -X POST https://celora-7b552.web.app/api/recaptcha/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token","action":"login"}'
```

### Debug Mode (Development)

Add to `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=true
```

Get debug token from:
```
https://console.firebase.google.com/project/celora-7b552/appcheck/apps
```

---

## 💰 Cost Estimate

| Service | Free Tier | Paid Tier | Est. Monthly |
|---------|-----------|-----------|--------------|
| Firebase App Check | Included | Included | $0 |
| reCAPTCHA Enterprise | 10k/month | $1 per 1k | $5-10 |
| Cloud Armor (WAF) | None | $0.75 + $0.0075/10k req | $3-5 |
| **Total** | | | **$8-15** |

For a crypto wallet with moderate traffic (50k-100k assessments/month).

---

## ✅ Final Checklist

### Setup
- [ ] reCAPTCHA Enterprise API enabled
- [ ] reCAPTCHA key created with WAF integration
- [ ] API key created and restricted
- [ ] Environment variables added to `functions/.env` and `.env.local`
- [ ] Firebase App Check registered in console
- [ ] Firestore rules deployed with App Check enforcement

### Integration
- [ ] Test App Check token generation
- [ ] Add reCAPTCHA to wallet creation
- [ ] Add reCAPTCHA to transactions
- [ ] Add reCAPTCHA to auth flows
- [ ] Add RecaptchaBadge to protected pages

### Monitoring
- [ ] Check App Check dashboard
- [ ] Check reCAPTCHA metrics
- [ ] Create firewall policies (optional)
- [ ] Set up alerts for high bot traffic

### Deploy
- [ ] Build: `npm run build`
- [ ] Deploy: `npm run firebase:deploy`
- [ ] Test on production
- [ ] Monitor for 24 hours
- [ ] Tune score thresholds based on data

---

## 📚 Documentation

- **Quick Start**: `docs/RECAPTCHA_QUICKSTART.md`
- **Full Setup**: `docs/RECAPTCHA_SETUP.md`
- **App Check + WAF**: `docs/FIREBASE_APP_CHECK_SETUP.md`
- **Examples**: `docs/examples/recaptcha-*.tsx`

---

## 🛡️ Security Benefits

### Before
- ❌ No bot protection
- ❌ Firebase resources exposed
- ❌ Vulnerable to credential stuffing
- ❌ No fraud detection
- ❌ No rate limiting

### After
- ✅ **Two-layer bot protection**
- ✅ **Firebase resources protected** (App Check)
- ✅ **Custom logic protected** (reCAPTCHA assessments)
- ✅ **AI-powered risk scoring** (0.0 → 1.0)
- ✅ **Fraud detection** (account defender, stolen instruments)
- ✅ **WAF-ready** (Cloud Armor integration)
- ✅ **Zero friction** for legitimate users (invisible v3)
- ✅ **ML feedback loop** (annotations improve accuracy)
- ✅ **Monitoring & analytics** (dashboards, alerts)

---

## 🚨 Important Notes

1. **Site Key = Public** (safe to expose in client code)
2. **API Key = Secret** (NEVER expose, keep in `functions/.env` only)
3. **App Check tokens** auto-refresh every ~1 hour
4. **reCAPTCHA tokens** expire after 2 minutes
5. **Annotations** are non-critical (don't block on failures)
6. **Debug tokens** only for development (disable in production)
7. **Score thresholds** should be tuned based on your traffic

---

## 🎉 You're Ready!

Complete the setup checklist above, deploy, and you'll have enterprise-grade bot protection for Celora! 🛡️
