# Virtual Cards / Spend Layer (Non-Custodial)

This guide defines integration patterns that avoid custody and heavy compliance burdens.

## Strategy
Use third-party providers that: issue cards, perform KYC, hold fiat balances. User funds move directly from their wallet → provider top-up → spend.

## Environment Variables
```bash
CARD_PROVIDER_API_KEY=<provider-key>
CARD_PROVIDER_WEBHOOK_SECRET=<32-byte-random>
FIAT_ONRAMP_PUBLIC_KEY=<optional>
FIAT_ONRAMP_API_KEY=<optional>
```

## Flow Overview
```
User Wallet (SOL/USDC) → Swap (optional) → Provider Top-Up Endpoint → Provider Card Balance
```

## Provider Criteria
| Requirement | Reason |
|-------------|--------|
| Non-custodial top-up | Avoid holding user assets |
| Transparent fees | User trust |
| Web widget / SDK | Fast integration |
| Webhook events | Balance + card status updates |

## Webhook Handling Example
```ts
import { NextRequest } from 'next/server';
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature');
  if (!signature || signature !== process.env.CARD_PROVIDER_WEBHOOK_SECRET) {
    return new Response('unauthorized', { status:401 });
  }
  const body = await req.json();
  // process events: top_up_confirmed, card_activated
  // store minimal public metadata
  return new Response('ok');
}
```

## UI Components
- Card widget embedded (iframe/provider Script).
- Top-up form: amount (USDC) → provider address.
- Status panel: last 5 card events.

## Security Notes
- Never request or display full PAN.
- Store only: last4, brand, expiration month/year (if needed).
- Hash card id if persisted.

## Monitoring
- Count top-up attempts vs successes.
- Track webhook failures.

## Roadmap
- [ ] Initial provider integration.
- [ ] Add balance polling fallback.
- [ ] Multi-provider abstraction.

## Status
Legacy provider-specific instructions removed. This guide stays generic and compliant.


### Webhook Security

```bash
# Webhook IP Allowlist (comma-separated)
CARD_WEBHOOK_IPS=52.1.2.3,52.1.2.4,52.1.2.5
# Leave empty to allow all IPs (NOT recommended for production)
```

### Encryption & Security

```bash
# Card Encryption (AES-256-GCM)
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=<64-char-hex-secret>
ENCRYPTION_SALT=<64-char-hex-secret>

# Master key for wallet encryption
MASTER_ENCRYPTION_KEY=<64-char-hex-secret>
```

### Cashback Configuration

```bash
# Default cashback token symbol
CASHBACK_TOKEN=CELO
# Alternative: USDC, USDT, ETH, etc.
```

### Feature Flags

```bash
# Enable/disable virtual cards feature
ENABLE_VIRTUAL_CARDS=true

# Enable/disable hidden vault feature
ENABLE_HIDDEN_VAULT=true

# Enable fraud monitoring
ENABLE_FRAUD_MONITORING=true
```

### Database

```bash
# PostgreSQL connection (with PgBouncer pooling)
DATABASE_URL=postgresql://user:pass@host:5432/celora?pgbouncer=true

# Direct connection for migrations
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/celora
```

### Redis (Rate Limiting)

```bash
REDIS_URL=rediss://:password@your-redis-host:6380
```

### Application Insights (Telemetry)

```bash
# Telemetry connection string
APPLICATION_INSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx
NEXT_PUBLIC_APPINSIGHTS_INSTRUMENTATION_KEY=<instrumentation-key>
```

## Webhook Registration

### Highnote Dashboard Configuration

1. **Login** to Highnote dashboard
2. **Navigate** to Settings → Webhooks
3. **Add Webhook URL**: `https://app.celora.com/api/cards/authorize`
4. **Set Events**:
   - `transaction.authorization_request`
   - `transaction.settled`
   - `transaction.declined`
   - `card.activated`
   - `card.frozen`
   - `card.cancelled`
5. **Configure Signature**:
   - Algorithm: HMAC-SHA256
   - Secret: Use `HIGHNOTE_WEBHOOK_SECRET` value
6. **IP Allowlist**: Add your webhook endpoint IPs

### Webhook Payload Example

```json
{
  "event": "transaction.authorization_request",
  "data": {
    "cardId": "card_abc123",
    "amount": 29.99,
    "currency": "USD",
    "merchantName": "Example Store",
    "merchantCountry": "US",
    "mcc": "5411",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "timestamp": "2025-11-15T12:34:56Z"
}
```

## Hosting Platform Configuration

### Environment Variables

Configure secrets via your hosting platform's environment variable system (Vercel, Railway, etc.):
- `HIGHNOTE_API_KEY`
- `HIGHNOTE_API_SECRET`
- `HIGHNOTE_WEBHOOK_SECRET`
- `ENCRYPTION_KEY`

### Identity & Access

```bash
# Grant App Service access to Key Vault
az keyvault set-policy \
  --name celora-vault \
  --object-id <app-service-managed-identity-object-id> \
  --secret-permissions get list
```

## Database Migration

### Manual Execution

```bash
# Generate migration
npx prisma migrate dev --name remove_cvv_field

# Apply to production (already automated in CI/CD)
npx prisma migrate deploy
```

### Verify Migration

```sql
-- Check Card table structure
\d cards

-- Should NOT have encrypted_cvv column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cards';
```

## Testing Webhook Security

### Generate HMAC Signature (Node.js)

```javascript
const crypto = require('crypto');

const payload = JSON.stringify({
  event: 'transaction.authorization_request',
  data: { cardId: 'card_test123', amount: 10.00, currency: 'USD' }
});

const signature = crypto
  .createHmac('sha256', process.env.HIGHNOTE_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

console.log('X-Webhook-Signature:', signature);
```

### Test Webhook Endpoint

```bash
curl -X POST https://app.celora.com/api/cards/authorize \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <calculated-hmac>" \
  -H "X-Card-Provider: highnote" \
  -d '{
    "cardId": "card_test123",
    "amount": 10.00,
    "currency": "USD",
    "merchantName": "Test Store",
    "merchantCountry": "US",
    "mcc": "5411"
  }'
```

## Monitoring & Alerts

### Application Insights Queries

```kusto
// Card authorization failures
customEvents
| where name == "card.authorization.declined"
| summarize count() by tostring(customDimensions.reason), bin(timestamp, 1h)

// Fraud anomalies
customEvents
| where name == "card.authorization.anomaly"
| project timestamp, cardId = tostring(customDimensions.cardId), reason = tostring(customDimensions.reason)

// Webhook signature failures
customEvents
| where name == "card.authorization.rejected" and customDimensions.reason == "invalid_signature"
| summarize count() by bin(timestamp, 5m)
```

## Security Checklist

- [ ] All secrets configured in hosting platform environment variables
- [ ] Webhook IP allowlist configured
- [ ] HMAC signature verification enabled
- [ ] CVV persistence removed (PCI DSS compliance)
- [ ] Rate limiting enabled (100 req/min per IP)
- [ ] Application Insights telemetry configured
- [ ] Fraud detection heuristics tested
- [ ] Database migrations automated in CI/CD
- [ ] Managed Identity permissions granted
- [ ] Webhook URL registered with Highnote
- [ ] Feature flags configured
- [ ] Test cards created successfully

## Rollout Plan

1. **Phase 1: Internal Testing** (Week 1)
   - Deploy to staging environment
   - Create test cards with Highnote sandbox
   - Verify webhook authorization flow
   - Test fraud detection with anomaly patterns

2. **Phase 2: Beta Users** (Week 2-3)
   - Enable `ENABLE_VIRTUAL_CARDS=true` for 10% of users
   - Monitor telemetry and error rates
   - Collect user feedback
   - Tune fraud thresholds

3. **Phase 3: General Availability** (Week 4)
   - Enable for all users
   - Monitor for 48 hours
   - Prepare rollback plan if needed

## Rollback Procedure

```bash
# Disable feature flag via hosting platform environment variables
# Set ENABLE_VIRTUAL_CARDS=false in dashboard

# Revert code if needed
git revert <commit-hash>
git push origin main
```

## Support & Documentation

- **Highnote Docs**: https://docs.highnote.com
- **Gnosis Pay Docs**: https://docs.gnosis-pay.com
- **PCI DSS Compliance**: https://www.pcisecuritystandards.org
