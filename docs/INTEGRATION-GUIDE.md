# Celora Multi-Platform Integration Guide

## Overview

This guide explains how all Celora platforms work together as a unified ecosystem.

## System Components

### 1. Next.js PWA (Main App)
- **URL**: `https://app.celora.com`
- **Purpose**: Full-featured web application
- **Capabilities**: All features, full control
- **Authentication**: Azure AD B2C

### 2. Browser Extension
- **Platforms**: Chrome, Edge, Firefox
- **Purpose**: Quick access sidebar
- **Capabilities**: View balances, manage cards, send/receive
- **Authentication**: Shared with PWA via cookies

### 3. Telegram Bot
- **Handle**: `@Celora_Bot`
- **Purpose**: Command-line interface
- **Capabilities**: Balance checks, transactions, card management
- **Authentication**: Linked via verification code

### 4. Telegram Mini App
- **Access**: Via bot or direct link
- **Purpose**: Full UI within Telegram
- **Capabilities**: Complete wallet interface
- **Authentication**: Telegram WebApp initData

## Data Flow

### Shared Database
All platforms read/write to the same PostgreSQL database:

```
┌──────────┐   ┌────────────┐   ┌──────────┐   ┌───────────┐
│   PWA    │   │ Extension  │   │Telegram  │   │Mini App   │
│          │   │            │   │   Bot    │   │           │
└────┬─────┘   └─────┬──────┘   └────┬─────┘   └─────┬─────┘
     │               │                │                │
     └───────────────┴────────────────┴────────────────┘
                            │
                     ┌──────▼───────┐
                     │  API Routes  │
                     └──────┬───────┘
                            │
                ┌───────────┴────────────┐
                │                        │
         ┌──────▼──────┐         ┌──────▼──────┐
         │  PostgreSQL │         │    Redis    │
         │  Database   │         │    Cache    │
         └─────────────┘         └─────────────┘
```

### Real-Time Sync

- **Extension**: Polls every 5 minutes + on popup open
- **Telegram**: Real-time via webhooks
- **Mini App**: Real-time in active session
- **PWA**: Real-time + ServiceWorker background sync

## Integration Points

### 1. User Account

**Single User Account Across Platforms:**
```typescript
{
  id: "uuid",
  email: "user@example.com",
  azureB2CId: "azure-id",        // For PWA/Extension
  telegramId: "telegram-id",      // For Telegram
  preferredCardProvider: "mock"   // Card preference
}
```

### 2. Card Management

**Cards Created Anywhere, Visible Everywhere:**

```typescript
// Create in PWA
POST /api/cards
→ Card stored in database

// View in Extension
GET /api/cards
→ Returns all cards

// Manage in Telegram
/cards command
→ Fetches from database

// Control in Mini App
Telegram WebApp → /api/cards
→ Same database
```

### 3. Transactions

**Transactions Initiated Anywhere, Tracked Everywhere:**

```typescript
// Send from Telegram
/send → POST /api/telegram/send
→ transactionService.broadcastTransaction()
→ Stored in database

// View in Extension
Extension opens → Fetches transactions
→ Shows in history

// Notification to all
Transaction complete
→ Notification service
→ Push + Email + Telegram
```

### 4. Notifications

**Multi-Channel Notification Delivery:**

```typescript
await sendNotification(userId, {
  title: "Transaction Received",
  body: "You received 0.5 SOL",
  channels: ['push', 'telegram', 'email']
});

// Delivers to:
// ✅ PWA (Web Push)
// ✅ Extension (Chrome notification)
// ✅ Telegram (Bot message)
// ✅ Email (SendGrid)
```

## Authentication Flows

### PWA/Extension Flow

```
1. User visits app or opens extension
2. Redirects to Azure AD B2C
3. User signs in (or creates account)
4. Returns with JWT token
5. Token stored in cookies
6. Token used for API requests
```

### Telegram Flow

```
1. User sends /start to bot
2. Bot instructs to link account
3. User goes to PWA Settings → Telegram
4. PWA generates 6-digit code
5. User enters code in bot
6. Bot verifies code with API
7. Accounts linked
8. Bot can now access user data
```

### Mini App Flow

```
1. User opens Mini App from bot
2. Telegram provides initData
3. Mini App validates initData signature
4. Creates temporary session
5. User authenticated
6. Full wallet access granted
```

## Security Integration

### Encryption Keys

**Same encryption across all platforms:**

```env
ENCRYPTION_KEY=shared-across-all-platforms
```

All platforms use the same key to encrypt/decrypt:
- Card numbers
- CVV codes
- Private keys
- PINs

### Audit Logging

**Every action logged with platform source:**

```typescript
{
  userId: "user-id",
  action: "card_frozen",
  platform: "telegram",  // or 'pwa', 'extension'
  timestamp: "2024-01-01T12:00:00Z"
}
```

## Use Case Examples

### Scenario 1: Create Card in PWA, Use in All Platforms

1. **PWA**: User creates virtual card
   - POST `/api/cards`
   - Card stored in database
   
2. **Extension**: Immediately sees new card
   - Opens extension
   - Fetches `/api/cards`
   - Card appears in list
   
3. **Telegram**: Can manage the card
   - `/cards` command
   - Bot fetches from database
   - Shows card with freeze/unfreeze buttons
   
4. **Mini App**: Full card details
   - Opens Telegram Mini App
   - Navigates to Cards section
   - Sees card with spending analytics

### Scenario 2: Transaction Notification Flow

1. **Incoming Transaction Detected**
   - Blockchain monitoring service
   - Transaction added to database
   
2. **Notification Sent to All Channels**
   - PWA: Web push notification
   - Extension: Chrome notification badge
   - Telegram: Bot sends message
   - Email: Sent via SendGrid
   
3. **User Can View From Any Platform**
   - PWA: Transaction history page
   - Extension: Recent transactions
   - Telegram: `/history` command
   - Mini App: History section

### Scenario 3: Emergency Card Freeze

1. **User Sees Suspicious Activity**
   - PWA notification: "Unusual transaction"
   
2. **Freeze from Telegram (Fastest)**
   - Opens Telegram
   - `/cards` command
   - Clicks "Freeze" button
   - Card frozen instantly
   
3. **Status Synced Everywhere**
   - PWA: Card shows "Frozen" status
   - Extension: Badge shows "Frozen"
   - Database: `status = 'frozen'`
   
4. **Further Transactions Blocked**
   - Any platform attempts
   - API returns "Card frozen"
   - Audit log records attempts

## Configuration

### Environment Variables (Shared)

All platforms use these from `.env.local`:

```env
# Database (shared)
DATABASE_URL=postgresql://...

# Redis Cache (shared)
REDIS_URL=redis://...

# Encryption (shared)
ENCRYPTION_KEY=...

# Azure B2C (PWA + Extension)
NEXT_PUBLIC_AZURE_B2C_CLIENT_ID=...

# Telegram (Bot + Mini App)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...

# Card Providers (all platforms)
HIGHNOTE_API_KEY=...
GNOSIS_PAY_ENABLED=true
```

### Platform-Specific Settings

**Extension Only:**
```json
// manifest.json
{
  "permissions": ["storage", "notifications", "idle"],
  "host_permissions": ["https://app.celora.com/*"]
}
```

**Telegram Bot Only:**
```typescript
// Set via BotFather
commands: [
  { command: 'start', description: 'Welcome' },
  { command: 'balance', description: 'View balances' }
]
```

## Testing Integration

### Test Across Platforms

```bash
# 1. Create card in PWA
curl -X POST http://localhost:3000/api/cards \
  -H "Cookie: auth-token=..." \
  -d '{"walletId":"...","brand":"VISA"}'

# 2. Verify in Extension
# Open extension → Cards tab → Should see new card

# 3. Manage in Telegram
# Send /cards to bot → Should list the card

# 4. Check in Mini App
# Open Mini App → Cards → Should show card
```

### Integration Test Checklist

- [ ] Create entity in one platform, see in others
- [ ] Update entity in one platform, sync to others
- [ ] Delete entity in one platform, reflect everywhere
- [ ] Notifications sent to all channels
- [ ] Authentication works on all platforms
- [ ] Audit logs show platform source correctly
- [ ] Session management across platforms
- [ ] Security policies enforced universally

## Deployment

### All Platforms Deploy Together

```bash
# 1. Push to GitHub
git push origin main

# 2. GitHub Actions runs
- Builds PWA
- Builds Extension
- Tests all platforms
- Deploys to Azure

# 3. Telegram Bot Auto-Updates
- Webhook points to new deployment
- Bot uses latest code immediately

# 4. Extension Auto-Updates (After Store Approval)
- Chrome Web Store review
- Auto-updates to users
```

### Rollback Strategy

If deployment fails:
```bash
# 1. Rollback Azure deployment
az webapp deployment slot swap --name celora-app --slot production

# 2. Telegram bot automatically uses rolled-back code
# 3. Extension users on old version unaffected
# 4. Mini App uses rolled-back API
```

## Monitoring

### Unified Dashboard

**Application Insights tracks:**
- Requests per platform
- Error rates per platform
- User engagement per platform
- Transaction volume per platform

**Queries:**
```kusto
// Transactions by platform
requests
| where name contains "api/cards"
| summarize count() by platform=customDimensions.platform

// Error rates
exceptions
| summarize errors=count() by platform=customDimensions.platform
```

## Best Practices

### For Developers

1. **Test on all platforms** before deploying
2. **Use shared types** from `src/types/`
3. **Consistent error handling** across platforms
4. **Audit log all actions** with platform field
5. **Use shared services** (transaction, price, notification)

### For Users

1. **Link all platforms** for best experience
2. **Enable notifications** on preferred channel
3. **Use strongest security** (2FA, PIN)
4. **Keep apps updated** for latest features

## Troubleshooting

### Sync Issues

**Problem**: Card created in PWA not showing in Telegram

**Solutions:**
1. Check database connection
2. Verify API endpoint works
3. Check Telegram bot has access to user
4. Review audit logs for errors
5. Test API directly with curl

### Authentication Issues

**Problem**: User authenticated in PWA but not in Telegram

**Solution:**
- These use different auth methods (B2C vs Telegram linking)
- Complete Telegram linking separately
- Check `user.telegramId` is set in database

---

**All platforms are now integrated and working together!** 🎉

















