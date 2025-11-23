# Card Issuing Providers Guide

## Overview

Celora supports multiple card issuing providers with easy switching through configuration.

## Available Providers

### 1. Mock Provider (Development) - FREE ✅

**Status**: Fully Implemented

**Cost**: $0 (Free forever)

**Use Case**: Development, testing, demos

**Features**:
- ✅ Full feature parity with real providers
- ✅ Realistic card numbers (Luhn valid)
- ✅ Transaction simulation
- ✅ ATM withdrawal simulation
- ✅ No external dependencies

**Configuration**:
```env
# No configuration needed - always available
CARD_PROVIDER=mock
```

**Implementation**: `src/server/services/cardIssuing/mock/provider.ts`

### 2. Gnosis Pay (Crypto-Native) - FREE Platform ✅

**Status**: Architecture Ready (SDK integration pending)

**Cost**:
- Setup: $0
- Monthly: $0
- Transaction: Gas fees only (~$0.10-0.50)
- Interchange: 1-2%

**Use Case**: Crypto-native users, self-custodial cards

**Features**:
- ✅ 100% decentralized
- ✅ Users keep custody of funds
- ✅ Spend crypto directly (no conversion)
- ✅ Smart contract based
- ✅ Global Visa network
- ✅ PIN + ATM support

**Configuration**:
```env
GNOSIS_PAY_ENABLED=true
GNOSIS_CHAIN_RPC_URL=https://rpc.gnosischain.com
GNOSIS_SAFE_ADDRESS=0x... # Your Gnosis Safe address
CARD_PROVIDER=gnosis
```

**Setup Steps**:
1. Create Gnosis Safe
2. Deploy card module
3. Connect to Visa network
4. Configure in Celora

**Documentation**: `src/server/services/cardIssuing/gnosis/` (to be implemented)

### 3. Highnote (Traditional Fiat) - $0 Platform Fee ✅

**Status**: Architecture Ready (API integration pending)

**Cost**:
- Setup: $0
- Monthly platform fee: $0
- Per card: $0
- Transaction: Interchange pass-through (~$0.10 + 0.5%)
- ATM: $2-3

**Use Case**: Traditional fiat cards, mainstream users

**Features**:
- ✅ Zero platform fees
- ✅ Modern API
- ✅ Virtual + physical cards
- ✅ Fast onboarding (1-2 weeks)
- ✅ Real-time authorization
- ✅ PIN + ATM globally

**Configuration**:
```env
HIGHNOTE_API_KEY=your-api-key
HIGHNOTE_API_SECRET=your-api-secret
HIGHNOTE_WEBHOOK_SECRET=generate-secret
CARD_PROVIDER=highnote
```

**Setup Steps**:
1. Apply at highnote.com
2. Complete KYC/compliance
3. Get API credentials
4. Configure webhook
5. Test in sandbox

**Documentation**: `src/server/services/cardIssuing/highnote/` (to be implemented)

### 4. Deserve (Backup) - Flexible Pricing ✅

**Status**: Architecture Ready (API integration pending)

**Cost**: Negotiable based on volume

**Use Case**: Backup provider, additional capacity

**Configuration**:
```env
DESERVE_API_KEY=your-api-key
CARD_PROVIDER=deserve
```

## Provider Selection

### Automatic Selection

Users can set their preferred provider:

```typescript
// In user preferences
user.preferredCardProvider = 'gnosis'; // or 'highnote' or 'mock'
user.cardType = 'crypto-native'; // or 'traditional'
```

### Selection Logic

```typescript
function selectProvider(user) {
  if (user.preferredCardProvider) {
    return user.preferredCardProvider;
  }
  
  if (user.cardType === 'crypto-native') {
    return 'gnosis'; // Free, decentralized
  } else {
    return 'highnote'; // Free platform, low fees
  }
}
```

### Manual Override

Force a specific provider via API:

```typescript
POST /api/cards
{
  "walletId": "...",
  "provider": "gnosis", // Force Gnosis Pay
  "brand": "VISA"
}
```

## Migration Between Providers

### Switching Providers

To change default provider:

1. Update environment variable
2. Restart application
3. New cards use new provider
4. Existing cards remain with original provider

**Example**:
```env
# Change from mock to Highnote
# CARD_PROVIDER=mock
CARD_PROVIDER=highnote
```

### Multi-Provider Support

You can run multiple providers simultaneously:

```env
# Enable all providers
GNOSIS_PAY_ENABLED=true
HIGHNOTE_API_KEY=your-key

# Users can choose per-card
```

Users select at card creation:
```
Create Card → Choose Provider:
- [ ] Gnosis Pay (Crypto, Free)
- [ ] Highnote (Fiat, Low Fee)
```

## Cost Comparison

### Example: 1000 Users, 1 Card Each

**Mock Provider (Development)**:
```
Monthly: $0
Transactions: $0
Total: $0 🎉
```

**Gnosis Pay (Production)**:
```
Setup: $0
Monthly: $0
Transactions (1000 tx): ~$100-500 (gas fees)
Total: ~$500/month
```

**Highnote (Production)**:
```
Setup: $0
Monthly: $0 (no platform fee!)
Transactions (1000 tx @ $50 avg): 
  - Interchange: 1000 × ($0.10 + $25 × 0.5%) = $225
ATM (100 withdrawals): 100 × $2.50 = $250
Total: ~$475/month
```

**Comparison**:
- Gnosis: Best for crypto users, zero middleman fees
- Highnote: Best for fiat users, predictable costs
- Combined: Best flexibility

## Implementation Guide

### Adding a New Provider

1. **Create provider directory**:
```bash
mkdir src/server/services/cardIssuing/newprovider
```

2. **Implement interface**:
```typescript
// src/server/services/cardIssuing/newprovider/provider.ts
import { ICardIssuingProvider } from '../interface';

export class NewProvider implements ICardIssuingProvider {
  readonly name = 'newprovider';
  
  async initialize(config) { /* ... */ }
  async createCard(request) { /* ... */ }
  // ... implement all methods
}
```

3. **Register in factory**:
```typescript
// src/server/services/cardIssuing/factory.ts
import { NewProvider } from './newprovider/provider';

if (process.env.NEWPROVIDER_API_KEY) {
  registerProvider('newprovider', new NewProvider());
}
```

4. **Update types**:
```typescript
// src/server/services/cardIssuing/types.ts
export type CardProvider = 'mock' | 'gnosis' | 'highnote' | 'deserve' | 'newprovider';
```

5. **Test thoroughly**:
```bash
npm test -- cardIssuing/newprovider
```

## Webhook Integration

### Setup Webhooks

Each provider sends events to:

```
POST /api/cards/webhooks/{provider}
```

**Example**:
- Gnosis: `/api/cards/webhooks/gnosis`
- Highnote: `/api/cards/webhooks/highnote`

### Webhook Events

Standard events:
- `card.created`
- `card.activated`
- `transaction.authorized`
- `transaction.settled`
- `transaction.declined`

### Processing

```typescript
// Webhook handler
export async function handleWebhook(provider, event) {
  const providerInstance = getProvider(provider);
  
  // Verify signature
  if (!providerInstance.verifyWebhook(event)) {
    return { error: 'Invalid signature' };
  }
  
  // Process event
  if (event.type === 'transaction.authorized') {
    const result = await providerInstance.handleAuthorization(event.data);
    return { approved: result.approved };
  }
}
```

## Recommendations

### For Development
✅ Use **Mock Provider**
- Zero cost
- Full features
- Instant testing

### For Launch (Crypto Focus)
✅ Use **Gnosis Pay**
- Zero platform fees
- Unique differentiator
- Crypto-native experience

### For Launch (Mainstream)
✅ Use **Highnote**
- Zero platform fees
- Traditional experience
- Proven reliability

### For Scale
✅ Use **Both** (Gnosis + Highnote)
- Let users choose
- Best of both worlds
- Maximum flexibility

---

**Ready to integrate?** Follow setup guides for each provider!

















