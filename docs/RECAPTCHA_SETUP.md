# reCAPTCHA Enterprise Setup Guide

## Overview
Celora now integrates **Google reCAPTCHA Enterprise** for advanced bot detection and fraud prevention across critical user flows.

## Architecture

### Components Created

1. **Configuration** (`src/config/recaptcha.ts`)
   - Project ID, site keys, secret keys
   - Action definitions (login, signup, wallet_create, transaction, etc.)
   - Score thresholds

2. **Server-Side Assessment Client** (`src/lib/recaptcha/assessmentClient.ts`)
   - `createAssessment()` - Verify tokens and get risk scores
   - `annotateAssessment()` - Feedback loop for ML improvement
   - `verifyToken()` - Helper for common verification pattern

3. **Client-Side Utils** (`src/lib/recaptcha/client.ts`)
   - `verifyRecaptchaToken()` - API wrapper
   - `annotateRecaptcha()` - Annotation wrapper
   - `executeAndVerifyRecaptcha()` - Convenience function

4. **React Hook** (`src/hooks/useRecaptcha.ts`)
   - `useRecaptcha()` - Load reCAPTCHA v3 script and execute tokens

5. **HOC Protection** (`src/components/recaptcha/withRecaptchaProtection.tsx`)
   - `withRecaptchaProtection()` - Wrap components to auto-verify on mount

6. **UI Components**
   - `RecaptchaBadge` - Required "Protected by reCAPTCHA" badge

7. **API Routes**
   - `POST /api/recaptcha/verify` - Server-side token verification
   - `POST /api/recaptcha/annotate` - Assessment annotation

## Setup Steps

### 1. Enable reCAPTCHA Enterprise

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `celora-7b552`
3. Enable **reCAPTCHA Enterprise API**:
   ```
   https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com
   ```
4. Click **Enable**

### 2. Create reCAPTCHA Keys

1. Go to [reCAPTCHA Enterprise Keys](https://console.cloud.google.com/security/recaptcha)
2. Click **Create Key**
3. Configure:
   - **Display Name**: `Celora Production v3`
   - **Platform Type**: Website
   - **reCAPTCHA Type**: Score-based (v3)
   - **Domains**: Add your domains:
     - `celora-7b552.web.app`
     - `celora-7b552.firebaseapp.com`
     - `localhost` (for development)
   - **Security Preferences**:
     - ✅ Enable WAF integration
     - ✅ Enable fraud prevention
     - ✅ Enable account defender

4. Copy the **Site Key** (starts with `6L...`)

### 3. Get API Key

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** > **API Key**
3. **Restrict the key**:
   - API restrictions: Select **reCAPTCHA Enterprise API**
   - Application restrictions: None (Functions will use this)
4. Copy the **API Key**

### 4. Configure Environment Variables

Add to `functions/.env`:

```bash
# reCAPTCHA Enterprise (server-side only)
RECAPTCHA_SECRET_KEY=your_api_key_here
```

Add to `.env.local` (for development):

```bash
# reCAPTCHA Enterprise (public)
NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=celora-7b552
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=6L...your_site_key_here

# reCAPTCHA Enterprise (server-side only)
RECAPTCHA_SECRET_KEY=your_api_key_here
```

### 5. Update Firebase Functions

The `functions/.env` file already loads via dotenv. Just add the `RECAPTCHA_SECRET_KEY` to it.

### 6. Deploy

```bash
npm run build
npm run firebase:deploy
```

## Usage Examples

### Example 1: Protect Wallet Creation

```tsx
'use client';

import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';
import { CreateSolanaWallet } from '@/components/solana/CreateSolanaWallet';

// Wrap component to auto-verify on mount
export default withRecaptchaProtection(CreateSolanaWallet, {
  action: 'wallet_create',
  minScore: 0.7, // Higher threshold for sensitive operations
  onVerificationFailed: (score) => {
    console.warn('Bot detected during wallet creation:', score);
    // Optional: log to analytics
  },
});
```

### Example 2: Protect Form Submission

```tsx
'use client';

import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha } from '@/lib/recaptcha/client';
import { toast } from '@/lib/toast';

export function SendSolana() {
  const { executeRecaptcha, ready } = useRecaptcha();

  const handleSend = async () => {
    // Execute reCAPTCHA before transaction
    const verification = await executeAndVerifyRecaptcha(
      executeRecaptcha,
      'transaction'
    );

    if (!verification.success) {
      toast.error('Security verification failed. Please try again.');
      return;
    }

    if (verification.score < 0.5) {
      toast.error('Unusual activity detected. Contact support if this persists.');
      return;
    }

    // Proceed with transaction...
  };

  return (
    <button onClick={handleSend} disabled={!ready}>
      Send SOL
    </button>
  );
}
```

### Example 3: Annotate After Transaction

```tsx
import { annotateRecaptcha } from '@/lib/recaptcha/client';

// After successful transaction
await annotateRecaptcha({
  assessmentName: 'projects/celora-7b552/assessments/12345',
  annotation: 'LEGITIMATE',
  transactionEvent: {
    eventType: 'MERCHANT_APPROVE',
    value: 0.5,
    currency: 'SOL',
  },
});

// After failed/fraudulent transaction
await annotateRecaptcha({
  assessmentName: 'projects/celora-7b552/assessments/12346',
  annotation: 'FRAUDULENT',
  reasons: ['FAILED_VERIFICATION', 'SUSPICIOUS_PATTERN'],
  transactionEvent: {
    eventType: 'MERCHANT_DENY',
  },
});
```

## Integration Points

### High Priority (Required)

1. **Wallet Creation** (`/wallet/create`)
   - Action: `wallet_create`
   - Min Score: 0.7

2. **Wallet Import** (`/wallet/import`)
   - Action: `wallet_import`
   - Min Score: 0.7

3. **Transactions** (`SendSolana`, swap components)
   - Action: `transaction` / `swap`
   - Min Score: 0.5

4. **Auth Flows** (login, signup, password reset)
   - Action: `login` / `signup` / `password_reset`
   - Min Score: 0.5

### Medium Priority (Recommended)

5. **Username Registration** (`/wallet/register-username`)
   - Action: `username_register`
   - Min Score: 0.5

6. **Telegram Linking** (`/link-telegram`)
   - Action: `link_telegram`
   - Min Score: 0.5

### Low Priority (Optional)

7. **Page Views** (analytics)
   - Action: `page_view`
   - Min Score: 0.3

## Score Guidelines

- **0.0 - 0.3**: Very likely bot/automated → Block
- **0.3 - 0.5**: Suspicious → Extra verification (2FA, email confirmation)
- **0.5 - 0.7**: Normal user → Allow
- **0.7 - 1.0**: Very likely human → Fast-track

## Firewall Policies (Optional)

Create automated blocking rules:

1. Go to [reCAPTCHA Firewall Policies](https://console.cloud.google.com/security/recaptcha/firewallpolicies)
2. Click **Create Policy**
3. Example policies:
   - **Block Low Scores**: If score < 0.3, block
   - **Rate Limit**: If score < 0.5 and > 10 requests/min, block
   - **Geographic**: Block specific countries
   - **Credential Stuffing**: Detect repeated failed logins

## Monitoring

1. **reCAPTCHA Metrics**: [View Dashboard](https://console.cloud.google.com/security/recaptcha)
   - Score distribution
   - Actions breakdown
   - Bot traffic patterns

2. **Annotation Feedback Loop**:
   - Annotate assessments after determining outcome
   - Improves ML model over time
   - Better fraud detection accuracy

## Compliance

- **Privacy Policy**: Update to mention reCAPTCHA data collection
- **Badge Required**: `<RecaptchaBadge />` must be visible on protected pages
- **GDPR**: reCAPTCHA Enterprise is GDPR-compliant

## Cost

- **Free Tier**: First 10,000 assessments/month
- **Paid**: $1 per 1,000 assessments after free tier
- **Fraud Prevention**: Additional $0.01 per assessment

## Testing

```bash
# Test verification endpoint
curl -X POST https://celora-7b552.web.app/api/recaptcha/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token","action":"login"}'

# Test annotation endpoint
curl -X POST https://celora-7b552.web.app/api/recaptcha/annotate \
  -H "Content-Type: application/json" \
  -d '{"assessmentName":"projects/celora-7b552/assessments/123","annotation":"LEGITIMATE"}'
```

## Next Steps

1. ✅ Enable reCAPTCHA Enterprise API
2. ✅ Create v3 site key
3. ✅ Get API key and restrict it
4. ⏳ Add env vars to `functions/.env` and `.env.local`
5. ⏳ Integrate into wallet creation flow
6. ⏳ Integrate into transaction flows
7. ⏳ Deploy and test
8. ⏳ Monitor dashboard and tune thresholds
