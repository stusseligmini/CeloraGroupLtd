# Vercel + Neon + Firebase Deployment Guide

## 🚀 Complete Setup: Vercel (Frontend) + Neon (Database) + Firebase (Auth)

**Total Cost: $0/month** 🎉

---

## 📋 Architecture Overview

```
┌───────────────────────────────────────────┐
│         VERCEL (Frontend)                 │
│  - Next.js 15 App Router                  │
│  - API Routes                             │
│  - Edge Functions                         │
│  - Vercel Analytics                       │
│  - Vercel Blob Storage                    │
└───────────────────────────────────────────┘
            │
    ┌───────┼────────┬──────────┐
    ▼       ▼        ▼          ▼
┌──────┐┌────────┐┌──────┐┌─────────┐
│ Neon ││Firebase││Firebase││ Vercel  │
│  DB  ││  Auth  ││Firestore│ Blob   │
└──────┘└────────┘└────────┘└─────────┘
  $0      $0        $0        $0
```

**Services:**
- **Vercel:** Hosting, CDN, Edge Functions
- **Neon:** PostgreSQL Database (Serverless)
- **Firebase Auth:** User authentication
- **Firestore:** Real-time data, notifications
- **Vercel Blob:** File storage (NFTs, images)

---

## 1️⃣ Setup Neon Database

### Step 1: Get Connection Strings

1. **Go to Neon Console:**
   https://console.neon.tech/app/projects/empty-cell-79611710

2. **Click "Connection Details"**

3. **Copy these two connection strings:**
   ```
   DATABASE_URL (Pooled):
   postgresql://neondb_owner:xxxxx@ep-muddy-credit-ah9j28py.us-east-1.aws.neon.tech/neondb?sslmode=require
   
   DIRECT_DATABASE_URL (Direct):
   postgresql://neondb_owner:xxxxx@ep-muddy-credit-ah9j28py-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

4. **Save these for later!**

### Step 2: Enable Neon Vercel Integration (Optional)

1. Go to: https://vercel.com/integrations/neon
2. Click "Add Integration"
3. Select your Vercel project
4. Auto-configures DATABASE_URL ✅

---

## 2️⃣ Setup Firebase Authentication

### Step 1: Get Firebase Config

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/celora-7b552

2. **Click "Project Settings" (⚙️)**

3. **Scroll to "Your apps" → Web app → Config**

4. **Copy the config object:**
   ```javascript
   {
     apiKey: "AIzaSy...",
     authDomain: "celora-7b552.firebaseapp.com",
     projectId: "celora-7b552",
     storageBucket: "celora-7b552.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

### Step 2: Enable Authentication Methods

1. **Go to: Authentication → Sign-in method**

2. **Enable these providers:**
   - ✅ Email/Password
   - ✅ Google
   - ✅ Phone (for SMS verification)
   - ✅ Anonymous (optional)

3. **Add authorized domains:**
   - `localhost` (for dev)
   - `celora.vercel.app`
   - Your custom domain

### Step 3: Generate Service Account Key

1. **Go to: Project Settings → Service Accounts**

2. **Click "Generate new private key"**

3. **Save the JSON file** (you'll use this in Vercel)

---

## 3️⃣ Setup Vercel Project

### Step 1: Connect GitHub Repository

1. **Go to Vercel Dashboard:**
   https://vercel.com/new

2. **Import Git Repository:**
   - Select: `stusseligmini/CeloraGroupLtd`
   - Framework: Next.js
   - Root Directory: `./`

3. **Don't deploy yet!** (we need to add env vars first)

### Step 2: Add Environment Variables

**Go to: Project Settings → Environment Variables**

Add these variables for **Production, Preview, Development**:

#### Database (Neon)
```bash
DATABASE_URL=postgresql://neondb_owner:xxx@ep-muddy-credit-ah9j28py.us-east-1.aws.neon.tech/neondb?sslmode=require

DIRECT_DATABASE_URL=postgresql://neondb_owner:xxx@ep-muddy-credit-ah9j28py-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

#### Firebase (Public - for client-side)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=celora-7b552.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=celora-7b552
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=celora-7b552.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

#### Firebase Service Account (Secret - server-side only)
```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"celora-7b552",...entire JSON...}
```
⚠️ **Paste the entire JSON as a single line!**

#### Encryption Keys
```bash
MASTER_ENCRYPTION_KEY=74f0037b0f1c4a059b2bd21e6eab515140018fd7bdbd55f78463244fcee65a18
WALLET_ENCRYPTION_KEY=e673e0175990667f6dd6e4ec331c308cf1b985a8046af6732c2421e17cc32e6d
SESSION_COOKIE_SECRET=4fad6dc3d38dcc1cccc98fc1007977a8
ENCRYPTION_KEY=72e1959249461b66b4d5a9e06aba0289b33874ec99dca2934f25c909009273cb
ENCRYPTION_SALT=0c29fd9635ea4dfeb2cee894fd8abbbc8971ef87552f6a3c66f0e13b08d081ee
```

#### App Configuration
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
CARD_PROVIDER=mock
CASHBACK_TOKEN=CELO
```

### Step 3: Enable Vercel Blob (Optional)

1. **Go to: Storage → Create Database**
2. **Select: Blob**
3. **Name:** `celora-storage`
4. **Vercel will auto-add:** `BLOB_READ_WRITE_TOKEN`

---

## 4️⃣ Deploy to Vercel

### Automatic Deployment

```bash
# Commit and push
git add -A
git commit -m "feat: Configure Vercel + Neon + Firebase deployment"
git push origin main
```

**Vercel will automatically:**
1. ✅ Detect push to main
2. ✅ Run `npm install --legacy-peer-deps`
3. ✅ Run `prisma generate`
4. ✅ Run `npm run build`
5. ✅ Deploy to Edge Network
6. ✅ Assign URL: `celora-group-ltd.vercel.app`

### Manual Deployment (via CLI)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 5️⃣ Run Database Migrations

### Option A: Automatic (Recommended)

Add to `vercel.json`:
```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && npm run build"
}
```
✅ **Already configured!**

### Option B: Manual (if needed)

```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://neondb_owner:xxx@ep-muddy-credit-ah9j28py.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Run migrations
npx prisma migrate deploy
```

---

## 6️⃣ Verify Deployment

### Check Build Logs

1. **Go to Vercel Dashboard → Deployments**
2. **Click latest deployment**
3. **Check logs for:**
   - ✅ `Prisma schema loaded`
   - ✅ `Generated Prisma Client`
   - ✅ `Database migrations applied`
   - ✅ `Build completed`

### Test Endpoints

```bash
# Health check
curl https://your-project.vercel.app/api/diagnostics/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-25T..."
}
```

### Test Firebase Auth

1. Visit: `https://your-project.vercel.app`
2. Try signing up with email
3. Check Firebase Console → Authentication → Users

---

## 7️⃣ Enable Firestore (Optional - for real-time features)

### Step 1: Create Firestore Database

1. **Go to Firebase Console → Firestore Database**
2. **Click "Create database"**
3. **Choose:** Production mode
4. **Location:** `us-east1` (closest to Neon)

### Step 2: Set Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Real-time price cache (public read)
    match /prices/{symbol} {
      allow read: if true;
      allow write: if false; // Only backend can write
    }
  }
}
```

---

## 8️⃣ Configure Custom Domain (Optional)

### Step 1: Add Domain to Vercel

1. **Go to: Project Settings → Domains**
2. **Add domain:** `celora.net`
3. **Vercel provides DNS records**

### Step 2: Update DNS

Add these records to your DNS provider:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 3: Update Firebase Auth

1. **Go to: Authentication → Settings → Authorized domains**
2. **Add:** `celora.net`
3. **Add:** `www.celora.net`

---

## 🔍 Troubleshooting

### Build fails with "Cannot connect to database"
**Solution:** Check DATABASE_URL in Vercel environment variables

### "Prisma Client not generated"
**Solution:** Ensure `prisma generate` runs before build in vercel.json

### Firebase Auth doesn't work
**Solution:** 
- Check NEXT_PUBLIC_FIREBASE_* variables are set
- Verify domain is in Firebase authorized domains
- Check browser console for CORS errors

### "Module not found" errors
**Solution:** 
- Clear `.next` cache: `rm -rf .next`
- Redeploy: `vercel --prod --force`

---

## 📊 Free Tier Limits

| Service | Free Tier | Your Usage (Est.) |
|---------|-----------|-------------------|
| **Vercel** | 100 GB bandwidth | ~5-10 GB ✅ |
| **Neon** | 3 GB storage, 300 hours compute | ~1 GB, 50 hours ✅ |
| **Firebase Auth** | 50K MAU | ~100-1000 ✅ |
| **Firestore** | 50K reads/day | ~5K-10K ✅ |
| **Vercel Blob** | 500 MB storage | ~100 MB ✅ |

**Total Cost: $0/month** for small-medium traffic 🎉

---

## ✅ Post-Deployment Checklist

- [ ] Vercel project connected to GitHub ✅
- [ ] All environment variables set (14 total)
- [ ] Neon database connection verified
- [ ] Firebase Auth configured
- [ ] Firestore rules set (if using)
- [ ] Build succeeds on Vercel
- [ ] Database migrations applied
- [ ] Health endpoint returns 200
- [ ] Can create user account
- [ ] Can create wallet
- [ ] Monitoring enabled (Vercel Analytics)

---

## 🚀 Next Steps

1. **Set up monitoring:** Vercel Analytics (already enabled)
2. **Add custom domain:** celora.net
3. **Configure CI/CD:** Preview deployments for PRs
4. **Enable Web Vitals:** Performance monitoring
5. **Set up Sentry:** Error tracking (optional)
6. **Add rate limiting:** Protect API routes
7. **Implement caching:** Redis/Upstash (optional)

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Prisma with Neon](https://www.prisma.io/docs/guides/database/neon)
- [Next.js 15 Documentation](https://nextjs.org/docs)

---

## 💡 Pro Tips

1. **Use Vercel Preview Deployments** for testing before prod
2. **Enable Vercel Analytics** for free (already in package.json)
3. **Set up Vercel Edge Config** for feature flags
4. **Use Vercel KV** for session storage (faster than Postgres)
5. **Enable Vercel Speed Insights** for performance monitoring
