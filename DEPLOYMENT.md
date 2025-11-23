# 🚀 Celora Deployment Guide (Vercel + Firebase)

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Chrome Extension / Telegram Bot      │
│              (Client Apps)                   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           Vercel (Next.js 15)               │
│  ┌──────────────────────────────────────┐   │
│  │    Web App + API Routes              │   │
│  │    - GraphQL API                     │   │
│  │    - Telegram Webhook                │   │
│  │    - Wallet Operations               │   │
│  └──────────────────────────────────────┘   │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   Firebase   │   │  PostgreSQL  │
│  - Auth      │   │  (Vercel)    │
│  - Firestore │   │  or Neon     │
│  - Storage   │   │              │
└──────────────┘   └──────────────┘
```

## Prerequisites

- ✅ Firebase Project created (celora-7b552)
- ✅ Firebase config in `.env.local`
- ✅ Vercel account
- ✅ PostgreSQL database (Vercel Postgres or Neon)
- ✅ Telegram Bot token

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `firebase` + `firebase-admin` (authentication & database)
- `graphql` + `graphql-request` (API)
- `@vercel/analytics` + `@vercel/speed-insights` (monitoring)
- `@vercel/blob` (file storage)

## Step 3: Environment Variables

### Development (`.env.local`):
Already configured with Firebase credentials.

### Production (Vercel Dashboard):

1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add these:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAnauWfK21qclea_kZM-GqDCHpzombR884
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=celora-7b552.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=celora-7b552
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=celora-7b552.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=505448793868
NEXT_PUBLIC_FIREBASE_APP_ID=1:505448793868:web:df0e3f80e669ab47a26b29

# Database (Vercel Postgres or Neon)
DATABASE_URL=postgresql://user:pass@host:5432/celora
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/celora

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# Encryption
MASTER_ENCRYPTION_KEY=<generate-with-openssl>
WALLET_ENCRYPTION_KEY=<generate-with-openssl>
SESSION_COOKIE_SECRET=<generate-with-openssl>

# Vercel Blob (optional, for file uploads)
BLOB_READ_WRITE_TOKEN=<from-vercel-dashboard>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Firebase Setup

### 1. Enable Authentication:
```bash
firebase login
firebase use celora-7b552
```

In Firebase Console:
1. Build → **Authentication** → Enable **Anonymous**
2. Build → **Firestore Database** → Create database (Production mode)
3. Deploy rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 2. Download Service Account (for Firebase Admin):
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Save as `firebase-admin-key.json` (DO NOT COMMIT)
4. Add to Vercel as base64:
```bash
cat firebase-admin-key.json | base64
```
5. In Vercel, add as `FIREBASE_SERVICE_ACCOUNT_KEY` (base64 encoded)

## Step 5: Database Migration

### Option A: Vercel Postgres (Recommended)
```bash
# Create database
vercel postgres create

# Link to project
vercel link

# Push schema
npx prisma generate
npx prisma db push
```

### Option B: Neon (Serverless Postgres)
1. Create database at neon.tech
2. Copy connection string
3. Add to Vercel env vars
4. Run migrations:
```bash
npx prisma migrate deploy
```

## Step 6: Deploy to Vercel

```bash
# Login
vercel login

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

Your app will be live at: `https://celora.vercel.app`

## Step 7: Telegram Webhook

After deployment, set webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://celora.vercel.app/api/telegram/webhook",
    "secret_token": "your-webhook-secret"
  }'
```

Verify:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Step 8: Chrome Extension

Update extension URLs to production:

1. Open `extension/manifest.json`
2. Already updated to: `https://celora.vercel.app/*`
3. Build extension:
```bash
npm run build:extension
```
4. Upload to Chrome Web Store

## Step 9: Vercel Analytics

Add to `src/app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Monitoring & Logs

### Vercel Dashboard:
- **Analytics**: User metrics, page views
- **Speed Insights**: Core Web Vitals
- **Logs**: Real-time function logs
- **Deployments**: History and rollbacks

### Firebase Console:
- **Authentication**: User signups, active users
- **Firestore**: Database usage, queries
- **Performance**: App performance metrics

## Cost Estimates

### Vercel (Hobby Plan - Free):
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Analytics included
- ⚠️ Upgrade to Pro ($20/month) for production

### Firebase (Spark Plan - Free):
- ✅ 10k document reads/day
- ✅ 20k document writes/day
- ✅ 1 GB storage
- ⚠️ Upgrade to Blaze (pay-as-you-go) for production

### Database:
- Vercel Postgres: $20/month
- Neon Free Tier: 0.5 GB storage (good for testing)

## Troubleshooting

### Build Errors:
```bash
# Clear cache
vercel --force

# Check logs
vercel logs
```

### Database Connection:
```bash
# Test connection
npx prisma db push --skip-generate
```

### Telegram Webhook:
```bash
# Delete webhook (for testing)
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Security Checklist

- [ ] All environment variables in Vercel (not in code)
- [ ] Firebase rules deployed
- [ ] Telegram webhook secret configured
- [ ] CORS configured in `vercel.json`
- [ ] Extension permissions limited to production domain
- [ ] Database migrations applied
- [ ] Service account key NOT in repository

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Set up Telegram webhook
3. ✅ Configure Firebase Authentication
4. ✅ Deploy Firestore rules
5. ✅ Test extension with production URL
6. ✅ Monitor analytics and logs
7. 🚀 Launch!

---

## Useful Commands

```bash
# Development
npm run dev

# Build locally
npm run build

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs

# Environment variables
vercel env ls
vercel env add

# Database
npx prisma studio
npx prisma migrate dev
npx prisma generate
```

---

**Support:** 
- Vercel Docs: https://vercel.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Telegram Bot API: https://core.telegram.org/bots/api
