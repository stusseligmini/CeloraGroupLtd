# Deployment Guide

## Quick Deploy

### Vercel (Recommended)
```bash
vercel --prod
```

### Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Firebase Auth
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...

# Solana
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=...

# Telegram (optional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
```

See `ENV_TEMPLATE.md` for complete list.

## Deployment Checklist

### Pre-Deploy
- [ ] Run tests: `npm test`
- [ ] Build locally: `npm run build`
- [ ] Check for type errors: `npm run type-check`
- [ ] Review environment variables

### Post-Deploy
- [ ] Verify wallet creation works
- [ ] Test SOL send transaction
- [ ] Confirm Firebase auth connection
- [ ] Check Telegram webhook (if enabled)

## Vercel Configuration

Project uses `vercel.json` for routing and headers. Key settings:
- API routes: `/api/**`
- Rewrites for Telegram webhook
- Security headers (CSP, HSTS)

## Database Migrations

Run Prisma migrations on deploy:
```bash
npx prisma migrate deploy
```

Vercel automatically runs this via `build` script.

## Monitoring

- Vercel Analytics: Built-in
- Error tracking: Check Vercel logs
- Database: Neon dashboard

## Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Production URLs

- Web: `https://celora.vercel.app` (or custom domain)
- API: Same origin `/api/**`
