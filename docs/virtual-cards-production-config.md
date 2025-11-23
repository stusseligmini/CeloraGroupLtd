# Virtual Cards Production Configuration Guide

## Environment Variables Required

### Card Issuing Provider (Highnote)

```bash
# Highnote API Configuration
HIGHNOTE_API_BASE_URL=https://api.highnote.com/v1  # Production
# HIGHNOTE_API_BASE_URL=https://api.sandbox.highnote.com/v1  # Sandbox
HIGHNOTE_API_KEY=<your-highnote-api-key>
HIGHNOTE_API_SECRET=<your-highnote-api-secret>
HIGHNOTE_PROGRAM_ID=<your-program-id>
HIGHNOTE_WEBHOOK_SECRET=<generate-32-char-secret>

# Alternative: Gnosis Pay (Crypto-native)
GNOSIS_PAY_API_BASE_URL=https://api.gnosis-pay.com
GNOSIS_PAY_API_KEY=<your-gnosis-api-key>
GNOSIS_PAY_API_SECRET=<your-gnosis-api-secret>
GNOSIS_PAY_WEBHOOK_SECRET=<generate-32-char-secret>
```

### Webhook Security

```bash
# Webhook IP Allowlist (comma-separated)
CARD_WEBHOOK_IPS=52.1.2.3,52.1.2.4,52.1.2.5
# Leave empty to allow all IPs (NOT recommended for production)

# Alternative: Use Azure Front Door IP ranges
# Download from: https://www.microsoft.com/en-us/download/details.aspx?id=56519
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
# Azure Redis Cache
REDIS_URL=rediss://:password@celora-cache.redis.cache.windows.net:6380
AZURE_REDIS_CONNECTION_STRING=<from-azure-portal>
```

### Application Insights (Telemetry)

```bash
# Telemetry connection string
APPLICATION_INSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx
NEXT_PUBLIC_APPINSIGHTS_INSTRUMENTATION_KEY=<instrumentation-key>
```

## Azure Key Vault Setup

Move sensitive secrets to Azure Key Vault:

```bash
# Key Vault URL
AZURE_KEY_VAULT_URL=https://celora-vault.vault.azure.net/

# Secrets to migrate:
# - ENCRYPTION_KEY → card-encryption-key
# - HIGHNOTE_API_KEY → highnote-api-key
# - HIGHNOTE_API_SECRET → highnote-api-secret
# - HIGHNOTE_WEBHOOK_SECRET → highnote-webhook-secret
```

### Runtime Secret Retrieval

Add to `src/lib/config/secrets.ts`:

```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
const credential = new DefaultAzureCredential();
const client = new SecretClient(keyVaultUrl, credential);

export async function getSecret(name: string): Promise<string> {
  const secret = await client.getSecret(name);
  return secret.value || '';
}
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

## Azure App Service Configuration

### App Settings to Add

```yaml
# In Azure Portal → App Service → Configuration → Application Settings
- HIGHNOTE_API_KEY: @Microsoft.KeyVault(SecretUri=https://celora-vault.vault.azure.net/secrets/highnote-api-key/)
- HIGHNOTE_API_SECRET: @Microsoft.KeyVault(SecretUri=https://celora-vault.vault.azure.net/secrets/highnote-api-secret/)
- HIGHNOTE_WEBHOOK_SECRET: @Microsoft.KeyVault(SecretUri=https://celora-vault.vault.azure.net/secrets/highnote-webhook-secret/)
- ENCRYPTION_KEY: @Microsoft.KeyVault(SecretUri=https://celora-vault.vault.azure.net/secrets/card-encryption-key/)
```

### Managed Identity Permissions

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

### Azure Monitor Alerts

```yaml
# Alert on high authorization failure rate
- name: "Card Authorization Failure Rate"
  condition: "customEvents | where name == 'card.authorization.declined' | count > 100 in 5 minutes"
  severity: "Error"
  action: "Send email to security@celora.com"

# Alert on webhook signature failures
- name: "Webhook Security Breach"
  condition: "customEvents | where name == 'card.authorization.rejected' | count > 10 in 1 minute"
  severity: "Critical"
  action: "PagerDuty escalation"
```

## Security Checklist

- [ ] All secrets moved to Azure Key Vault
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
# Disable feature flag
az webapp config appsettings set \
  --name celora-web \
  --resource-group celora-prod \
  --settings ENABLE_VIRTUAL_CARDS=false

# Revert code if needed
git revert <commit-hash>
git push origin main
```

## Support & Documentation

- **Highnote Docs**: https://docs.highnote.com
- **Gnosis Pay Docs**: https://docs.gnosis-pay.com
- **PCI DSS Compliance**: https://www.pcisecuritystandards.org
- **Azure Key Vault**: https://docs.microsoft.com/azure/key-vault
