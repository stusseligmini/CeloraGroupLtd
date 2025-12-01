# Setup Guide

Complete setup for local development.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon free tier)
- Firebase project (free tier)
- Helius API key (free tier)

## Installation

```bash
# Clone and install
git clone <repo-url>
cd CeloraV2
npm install

# Copy environment template
cp .env.example .env.local
```

## Environment Configuration

Edit `.env.local`:

```bash
# Database (Neon recommended)
DATABASE_URL="postgresql://user:pass@host/celora?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/celora?sslmode=require"

# Firebase Authentication
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=celora-xyz.firebaseapp.com
FIREBASE_PROJECT_ID=celora-xyz
FIREBASE_STORAGE_BUCKET=celora-xyz.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=your_helius_api_key

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random_secret_string
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=celorawalletbot

# Optional: Performance flags (dev)
NEXT_PUBLIC_DISABLE_PRICES=true
NEXT_PUBLIC_DISABLE_WSS=true
```

See `ENV_TEMPLATE.md` for detailed descriptions.

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

## Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication → Email/Password
3. Add authorized domain: `localhost`
4. Copy config values to `.env.local`

Detailed guide: `FIREBASE_SETUP.md`

## Telegram Bot (Optional)

1. Create bot via @BotFather on Telegram
2. Get bot token
3. Add to `.env.local`
4. Deploy webhook after first deploy

Detailed guide: `TELEGRAM_SETUP.md`

## Development

```bash
# Start dev server
npm run dev

# Visit http://localhost:3000
```

### Performance Optimization

For slow machines, enable performance flags in `.env.local`:
```bash
NEXT_PUBLIC_DISABLE_PRICES=true   # Skip price polling
NEXT_PUBLIC_DISABLE_WSS=true      # Skip WebSocket subscriptions
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Building

```bash
# Production build
npm run build

# Start production server
npm start
```

## Troubleshooting

### Database connection fails
- Check `DATABASE_URL` format
- Verify PostgreSQL is running
- Test direct connection with `psql`

### Firebase auth not working
- Verify all Firebase env vars are set
- Check authorized domains in Firebase console
- Ensure API key is correct

### Solana RPC errors
- Verify Helius API key is valid
- Check rate limits (free tier: 100 req/s)
- Try different RPC endpoint

### Slow performance
- Enable performance flags (see above)
- Reduce WebSocket connections
- Use production build (`npm run build`)

## Project Structure

```
CeloraV2/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── lib/           # Core libraries
│   │   ├── solana/    # Solana wallet logic
│   │   ├── username.ts # Username system
│   │   └── casino.ts  # Casino presets
│   └── server/        # Server-only code
├── prisma/            # Database schema
├── public/            # Static assets
└── docs/              # Documentation
```

## Next Steps

1. Create Solana wallet
2. Test send transaction
3. Register username
4. Try casino deposit preset

See `ROADMAP.md` for feature completion status.
