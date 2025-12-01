# Deployment Guide (Deprecated)

This document described a Vercel/Neon deployment flow that is no longer used.
Celora now deploys on Firebase App Hosting with Firestore/Firebase Auth.

See: `docs/FIREBASE_SETUP.md` and `firebase.json` for current deployment.

---

## Legacy Quick Deploy (Vercel)

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

Note: This section is legacy and for reference only.

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

## Vercel Configuration (Legacy)

Project previously used `vercel.json`. Current hosting uses `firebase.json`.

## Database Migrations

Run Prisma migrations on deploy:
```bash
npx prisma migrate deploy
```

Note: Firebase App Hosting now runs the build and any migration steps.

## Monitoring (Legacy)

Refer to Firebase Console (App Hosting/Cloud Run logs) for current monitoring.

## Rollback (Legacy)

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Production URLs

- Web: `https://app.celora.com` (primary) or `https://celora-7b552.web.app`
- API: Same origin `/api/**`
