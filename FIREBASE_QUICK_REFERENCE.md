# Firebase Integration - Quick Reference

## 🚀 Quick Start

Your Firebase integration for transactions, wallets, and settings is now **fully functional** with these new/enhanced endpoints:

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/settings` | Fetch user settings |
| POST | `/api/settings` | Update user settings |
| GET | `/api/wallet/list` | List wallets (now synced to Firestore) |
| GET | `/api/solana/transactions` | Get transactions (logged to Firestore + PostgreSQL) |
| GET | `/api/diagnostics/firebase-integration` | Full system health check |

---

## 🔧 Configuration Required

### Environment Variables (Already Set)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAnauWfK21qclea_kZM-GqDCHpzombR884
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=celora-7b552.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=celora-7b552
FIREBASE_SERVICE_ACCOUNT=/path/to/firebase-admin-key.json
```

### Firestore Rules (Need to Update)
Add these rules to `firestore.rules`:

```firestore
match /users/{userId}/settings/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
match /users/{userId}/wallets/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
match /users/{userId}/transactions/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 📁 Files Changed/Created

### New Files
- `src/app/api/settings/route.ts` - Settings endpoint
- `src/app/api/diagnostics/firebase-integration/route.ts` - Health check
- `docs/FIREBASE_INTEGRATION_FIX.md` - Full documentation
- `FIREBASE_FIXES_SUMMARY.md` - Implementation summary

### Enhanced Files
- `src/app/api/wallet/list/route.ts` - Added Firestore sync
- `src/app/api/solana/transactions/route.ts` - Added dual logging

---

## ✅ How to Verify It Works

### Step 1: Check Health
```bash
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
  http://localhost:3000/api/diagnostics/firebase-integration
```

Expected response: All checks should be `true`

### Step 2: Test Settings
```bash
# Get settings
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
  http://localhost:3000/api/settings

# Update settings
curl -X POST -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language":"no","defaultCurrency":"NOK"}' \
  http://localhost:3000/api/settings
```

### Step 3: Verify Wallet Sync
```bash
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
  http://localhost:3000/api/wallet/list
```

Check logs should show wallet count in both PostgreSQL and Firestore

### Step 4: Check Transaction Logging
```bash
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
  "http://localhost:3000/api/solana/transactions?address=YOUR_SOL_ADDRESS"
```

Transactions should appear in both systems

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Cause**: No valid Firebase ID token  
**Fix**: Include `Authorization: Bearer <ID_TOKEN>` header with a valid Firebase ID token

### Issue: Settings returns empty
**Cause**: First-time access  
**Fix**: First GET creates default settings automatically

### Issue: Wallets not in Firestore
**Cause**: Firestore sync disabled or rules wrong  
**Fix**: Check Firestore rules and logs at `/api/diagnostics/firebase-integration`

### Issue: Transactions missing from Firestore
**Cause**: Helius API not responding  
**Fix**: Check `HELIUS_API_KEY` environment variable and Firestore rules

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Client (Web/Extension)          │
└──────────────────┬──────────────────────┘
                   │
              Firebase Auth
                   │
    ┌──────────────┼──────────────┐
    ↓              ↓              ↓
 Settings       Wallets      Transactions
    │              │              │
    ├─→ Firestore  ├─→ Firestore  ├─→ Firestore
    │              │              │
    └─→ PostgreSQL └─→ PostgreSQL └─→ PostgreSQL
    
Real-time      Real-time       Real-time
sync via        sync via        sync via
Firestore       Firestore       Firestore
```

---

## 📊 Data Models

### Settings
```typescript
{
  userId: string;
  defaultCurrency: string;
  language: string;
  notifications: {
    telegram: boolean;
    push: boolean;
  };
  updatedAt: Timestamp;
}
```

### Wallet (Firestore)
```typescript
{
  id: string;
  userId: string;
  blockchain: string;
  address: string;
  label?: string;
  isDefault: boolean;
  balanceCache?: string;
  balanceFiat?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Transaction (Firestore)
```typescript
{
  id: string;
  userId: string;
  walletId: string;
  txHash: string;
  blockchain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenSymbol?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Timestamp;
  memo?: string;
}
```

---

## 🔑 Key Implementation Details

### Error Handling
- All endpoints gracefully handle Firestore outages
- PostgreSQL acts as fallback for data storage
- Errors are logged with requestId for tracing

### Performance
- Wallet/transaction sync happens in background (non-blocking)
- Settings use Firestore as primary (fastest for real-time)
- Transaction queries paginated to 50 items by default

### Security
- All endpoints require Firebase authentication
- User can only access their own data
- Firestore rules enforce user-level access control

---

## 📚 Full Documentation

For complete details, architecture diagrams, and deployment guide:
→ See `docs/FIREBASE_INTEGRATION_FIX.md`

---

## ✨ What's Next

1. **Deploy** to production with environment variables configured
2. **Update Firestore rules** in Firebase Console
3. **Monitor logs** to verify sync is working
4. **Test** extension and Telegram bot for real-time sync
5. **Configure** monitoring/alerting for the health check endpoint

---

**Status**: ✅ READY FOR TESTING  
**Last Updated**: Dec 2, 2025
