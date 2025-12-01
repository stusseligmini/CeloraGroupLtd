# reCAPTCHA Enterprise Quick Start

## 1. Enable API (5 minutes)

```bash
# Go to Google Cloud Console
https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com?project=celora-7b552

# Click "Enable"
```

## 2. Create reCAPTCHA Key (3 minutes)

```bash
# Go to reCAPTCHA Enterprise
https://console.cloud.google.com/security/recaptcha?project=celora-7b552

# Click "Create Key"
# - Name: Celora Production v3
# - Type: Score-based (v3)
# - Domains: celora-7b552.web.app, localhost
# - Enable: WAF, Fraud Prevention, Account Defender

# Copy the SITE KEY (starts with 6L...)
```

## 3. Create API Key (2 minutes)

```bash
# Go to Credentials
https://console.cloud.google.com/apis/credentials?project=celora-7b552

# Create Credentials > API Key
# Restrict to: reCAPTCHA Enterprise API only
# Copy the API KEY
```

## 4. Add Environment Variables

**Add to `functions/.env`:**
```bash
RECAPTCHA_SECRET_KEY=your_api_key_here
```

**Add to `.env.local` (for dev):**
```bash
NEXT_PUBLIC_RECAPTCHA_PROJECT_ID=celora-7b552
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=6L...your_site_key_here
RECAPTCHA_SECRET_KEY=your_api_key_here
```

## 5. Deploy

```bash
npm run build
npm run firebase:deploy
```

## 6. Test

Visit: `https://celora-7b552.web.app/wallet/create`

Open DevTools Console:
- Should see: "reCAPTCHA ready"
- Should auto-verify before showing wallet creation form
- Check Network tab for `/api/recaptcha/verify` call

## What You Get

✅ **Automatic bot detection** on:
- Wallet creation
- Wallet import  
- Transactions
- Swaps
- Auth flows
- Username registration

✅ **Invisible verification** (reCAPTCHA v3)
- No CAPTCHAs for users to solve
- Background risk scoring
- Blocks bots automatically

✅ **Smart thresholds**:
- 0.7+ for wallet operations (strict)
- 0.5+ for transactions (balanced)
- 0.3+ for login (lenient)

✅ **Fraud analytics**:
- View bot traffic patterns
- Track score distribution
- Monitor blocked attempts

## Integration Examples

### Protect a Component
```tsx
import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';

export default withRecaptchaProtection(MyComponent, {
  action: 'wallet_create',
  minScore: 0.7,
});
```

### Protect a Form Submit
```tsx
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha } from '@/lib/recaptcha/client';

const { executeRecaptcha } = useRecaptcha();

const handleSubmit = async () => {
  const result = await executeAndVerifyRecaptcha(executeRecaptcha, 'transaction');
  if (!result.success) return; // Blocked
  // Proceed...
};
```

### Server-Side Verification
```tsx
import { verifyToken } from '@/lib/recaptcha/assessmentClient';

const { verified } = await verifyToken(token, 'wallet_create', { minScore: 0.7 });
if (!verified) return res.status(403).json({ error: 'Bot detected' });
```

## Monitoring

Dashboard: https://console.cloud.google.com/security/recaptcha?project=celora-7b552

- **Assessments**: Total verifications
- **Score Distribution**: 0.0 (bot) → 1.0 (human)  
- **Actions**: Breakdown by action type
- **Blocked**: Automated blocks

## Cost

- Free: 10,000 assessments/month
- Paid: $1 per 1,000 after free tier
- Estimated: ~$5-10/month for typical crypto wallet

## Next Steps

1. ✅ Complete setup (steps 1-5 above)
2. ⏳ Test on production
3. ⏳ Monitor dashboard
4. ⏳ Tune score thresholds based on data
5. ⏳ Add firewall policies (auto-block low scores)

## Support

- Docs: `docs/RECAPTCHA_SETUP.md` (detailed guide)
- Examples: `docs/examples/recaptcha-*.tsx`
- API: https://cloud.google.com/recaptcha-enterprise/docs
