# 🚀 Celora V2 - Quickstart Guide

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Azure)
- Redis (optional, for caching)

## Installation (5 minutes)

### Step 1: Clone & Install

```bash
git clone <your-repo>
cd CeloraV2
npm install
```

### Step 2: Configure Environment

```bash
# Copy template
cp ENV_TEMPLATE.md .env.local

# Edit .env.local - MINIMUM REQUIRED:
DATABASE_URL=postgresql://user:password@localhost:5432/celora
DIRECT_DATABASE_URL=postgresql://user:password@localhost:5432/celora

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env.local as ENCRYPTION_KEY=<generated-key>
```

### Step 3: Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Create database
npm run db:push
# or for migrations:
npm run db:migrate

# (Optional) Seed with test data
npm run db:seed
```

### Step 4: Start Development

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## Platform-Specific Setup

### 🧩 Browser Extension

```bash
# Build extension
npm run build:extension

# Chrome/Edge:
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select ./extension folder

# Firefox:
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Select ./extension/manifest.json
```

### 💬 Telegram Bot

#### 1. Create Bot

1. Open Telegram, find `@BotFather`
2. Send `/newbot`
3. Name: `Celora Wallet`
4. Username: `celora_test_bot` (or your choice)
5. Save the bot token

#### 2. Configure

```bash
# Add to .env.local
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TELEGRAM_BOT_ENABLED=true
```

#### 3. Setup Webhook (Local Development)

```bash
# Install ngrok
# https://ngrok.com/download

# Start ngrok
ngrok http 3000

# Note the https URL (e.g., https://abc123.ngrok.io)

# Set webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok.io/api/telegram/webhook",
    "secret_token": "<YOUR_WEBHOOK_SECRET>"
  }'

# Verify
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

#### 4. Test

Send `/start` to your bot!

---

## Testing the Integration

### Test Telegram Account Linking

1. Start dev server: `npm run dev`
2. Open PWA: `http://localhost:3000`
3. Sign in (create test account if needed)
4. In Telegram, send `/start` to bot
5. In PWA, go to Settings (when implemented)
6. Generate linking code
7. Enter code in Telegram bot
8. ✅ Account linked!

### Test Card Creation

```bash
# Create card via API
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<your-token>" \
  -d '{
    "walletId": "<wallet-id>",
    "brand": "VISA",
    "nickname": "Test Card",
    "monthlyLimit": 1000
  }'

# Check in Telegram
Send /cards to bot → Should see new card

# Check in Extension
Open extension → Cards tab → Should see new card
```

### Test Balance Display

```bash
# All platforms should show same balances:

# PWA: http://localhost:3000 (main page)
# Extension: Click icon (Wallet tab)
# Telegram: Send /balance
# Mini App: http://localhost:3000/telegram
```

---

## Common Issues & Solutions

### Database Connection Error

```
Error: P1001: Can't reach database server
```

**Solution:**
```bash
# Start PostgreSQL
# macOS: brew services start postgresql
# Windows: net start postgresql-x64-14
# Linux: sudo systemctl start postgresql

# Or use Docker:
docker run --name celora-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

### Telegram Webhook Not Working

**Check:**
```bash
# 1. Verify webhook is set
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# 2. Check ngrok is running
# Should show forwarding to localhost:3000

# 3. Test webhook manually
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <SECRET>" \
  -d '{"update_id":1,"message":{"message_id":1,"from":{"id":123},"chat":{"id":123},"text":"/start"}}'
```

### Extension Not Loading

**Solution:**
```bash
# Rebuild extension
npm run build:extension

# In Chrome:
# Extensions page → Click reload icon on Celora extension

# Check console for errors
```

### Prisma Client Not Found

```bash
npm run db:generate
```

---

## Development Workflow

### Daily Development

```bash
# 1. Start dev server
npm run dev

# 2. Make changes to code

# 3. Check types
npm run typecheck

# 4. Run tests
npm test

# 5. Lint
npm run lint

# 6. Commit
git add .
git commit -m "Your changes"
```

### Before Deploying

```bash
# Full check
npm run check  # Runs lint + typecheck

# Build
npm run build

# Test extension build
npm run build:extension
```

---

## Project Structure Quick Reference

```
CeloraV2/
├── src/
│   ├── app/
│   │   ├── api/telegram/          ← Telegram API endpoints
│   │   └── telegram/               ← Mini App pages
│   ├── server/
│   │   ├── services/
│   │   │   └── cardIssuing/        ← Card provider system
│   │   └── telegram/               ← Bot implementation
│   ├── lib/
│   │   ├── telegram/               ← WebApp SDK
│   │   ├── security/               ← Security utils
│   │   └── qrcode-generator.ts     ← QR codes
│   └── components/
│       └── telegram/               ← Telegram components
├── extension/                      ← Browser extension
├── prisma/
│   └── schema.prisma              ← Database schema
├── docs/                           ← Documentation
└── infra/                          ← Infrastructure
```

---

## Next Steps

### 1. Customize

- Update branding: `public/celora-logo*.svg`
- Modify colors: `tailwind.config.ts`
- Add features: See documentation

### 2. Add Real Card Provider

```bash
# For Gnosis Pay
GNOSIS_PAY_ENABLED=true
# Follow docs/CARD-PROVIDERS.md

# For Highnote
HIGHNOTE_API_KEY=get-from-highnote
# Follow docs/CARD-PROVIDERS.md
```

### 3. Deploy to Production

Follow [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)

---

## Support

- **Documentation**: `docs/` folder
- **Issues**: GitHub Issues
- **Email**: support@celora.com

---

**Happy coding! 🚀**

Your complete multi-platform crypto wallet is ready to go!










