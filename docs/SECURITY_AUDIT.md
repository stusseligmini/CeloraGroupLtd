# Pre-Release Security & Deployment Audit

## Critical Fixes Applied

### 1. Service Worker Security ✅
**Issue:** Service worker cached all `/api/**` endpoints including sensitive data (wallet, auth, payments).

**Fix:**
- Excluded `/api/auth/`, `/api/wallet/`, `/api/payment-requests/`, `/api/telegram/`, `/api/cards/`, `/api/multisig/` from caching
- Added `Cache-Control: no-store` respect via `cacheWillUpdate` plugin
- Excluded sensitive mutations from background sync queue (vault operations, card authorization, payments)

**Risk Reduced:** High → Low

### 2. Build Configuration ✅
**Issue:** Next.js warned about multiple lockfiles causing output tracing issues.

**Fix:**
- Added `outputFileTracingRoot: __dirname` to `next.config.js`
- Recommendation: Delete `C:\Users\volde\package-lock.json` manually

**Impact:** Build stability improved, cleaner deployments

### 3. Browser Extension Security ✅
**Issue:** Extension `web_accessible_resources` allowed `<all_urls>` - any website could load extension assets.

**Fix:**
- Narrowed to only Celora domains: `app.celora.azure`, `celora.azurewebsites.net`, `api.celora.azure`

**Risk Reduced:** Medium → Low

### 4. JWT Signature Verification ✅
**Issue:** Auth relied on unsigned JWT decoding (`decodeJwt`) - no signature validation.

**Fix:**
- Created `src/lib/auth/jwtVerification.ts` with Azure B2C JWK validation using `jose`
- Validates issuer, audience, expiration, and signature
- Available for critical operations (use `verifyAzureB2CToken` instead of `decodeJwt`)

**Usage Example:**
```typescript
import { verifyTokenWithSignature } from '@/lib/auth/jwtVerification';

const token = request.cookies.get('auth-id-token')?.value;
const result = await verifyTokenWithSignature(token);

if (!result.valid) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}

const userId = result.payload.oid || result.payload.sub;
```

**Risk Reduced:** Critical → Medium (implement on money-moving routes)

### 5. Runtime Safety Markers ✅
**Issue:** API routes using Node crypto didn't explicitly declare `runtime = 'nodejs'`.

**Fix:**
- Added `export const runtime = 'nodejs'` to:
  - `/api/wallet/vault/route.ts` (uses pinProtection with Node crypto)
  - `/api/cards/authorize/route.ts` (uses HMAC verification)

**Impact:** Prevents accidental Edge runtime usage, clearer intent

---

## Remaining Recommendations (Non-Blocking)

### Medium Priority
1. **Implement JWT verification on critical routes:**
   - `/api/wallet/vault` (vault unlock)
   - `/api/cards/authorize` (card transactions)
   - `/api/payment-requests` (money transfers)
   - Example: Replace `getUserIdFromRequest` with verified token on these routes

2. **Rate Limiting at Scale:**
   - Current: In-memory (fine for single instance)
   - Production: Enable Azure Front Door WAF rate limiting or Upstash Redis REST API
   - Config: Set rate limits per endpoint in AFD rules

3. **Prisma Migration Hygiene:**
   - Current: Used `db push` + manual migration marking
   - Recommended: Generate proper migration from current schema:
     ```bash
     npx prisma migrate dev --name initial_schema
     ```
   - Deploy to production with `prisma migrate deploy`

4. **Key Vault Setup:**
   - Update `.env.local` with real `AZURE_KEY_VAULT_URL` for test environment
   - Verify managed identity or service principal has `Get` and `List` secret permissions
   - Test with: `npm run dev` and check logs for Key Vault connection

### Low Priority
5. **Bundle Optimization:**
   - Lazy-load `WalletConnectManager` (only on dApp pages)
   - Dynamic import `multisig` page (107 kB route)
   - Consider code-splitting vendor chunks further

6. **Telemetry Build Warnings:**
   - Optional dependencies missing: `pino-pretty`, `@azure/functions-core`
   - Non-blocking; add to `package.json` or suppress warnings with:
     ```json
     "devDependencies": {
       "pino-pretty": "^11.0.0"
     }
     ```

7. **CSP Reporting:**
   - Add `report-uri` or `report-to` directive to CSP in production
   - Monitor violations in Azure Application Insights

---

## Security Posture Summary

| Area | Before | After | Status |
|------|--------|-------|--------|
| Service Worker Caching | High Risk | Low Risk | ✅ Fixed |
| JWT Validation | No Signature Check | JWK Verification Available | ⚠️ Ready (implement on routes) |
| CSRF Protection | Good | Good | ✅ Solid |
| CSP | Strong | Strong | ✅ Solid |
| Rate Limiting | In-Memory | In-Memory | ⚠️ Scale with AFD |
| Extension Permissions | Over-Permissive | Scoped | ✅ Fixed |
| Secrets Management | Good | Good | ✅ Solid |

---

## Deployment Checklist

- [x] Fix service worker caching rules
- [x] Add `outputFileTracingRoot` to Next.js config
- [x] Narrow extension permissions
- [x] Install `jose` for JWT verification
- [x] Add runtime directives to crypto-using routes
- [ ] Delete `C:\Users\volde\package-lock.json` (manual)
- [ ] Implement JWT signature verification on critical routes
- [ ] Configure Azure Front Door rate limiting (production)
- [ ] Set real `AZURE_KEY_VAULT_URL` in deployment
- [ ] Generate clean Prisma migration for production
- [ ] Test service worker with dev tools (no sensitive data cached)
- [ ] Verify Azure B2C JWK endpoint is reachable

---

## Testing Before Public Launch

1. **Service Worker:**
   ```bash
   # Dev mode
   npm run dev
   # Open DevTools > Application > Service Worker
   # Verify sw.js is registered
   # Check Cache Storage - should NOT have /api/wallet/*, /api/auth/*
   ```

2. **JWT Verification:**
   ```bash
   # Test in API route
   const result = await verifyTokenWithSignature(token);
   console.log('Token valid:', result.valid);
   ```

3. **Build Validation:**
   ```bash
   npm run build
   # Should see: outputFileTracingRoot fix (no multiple lockfiles warning)
   # Exit code 0
   ```

4. **Extension:**
   - Load unpacked extension in Chrome
   - Verify it only works on Celora domains
   - Test web3 provider injection

---

## Critical Production Secrets

Ensure these are set in Azure App Service or Key Vault:

```bash
# Required
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
AZURE_B2C_CLIENT_ID=...
AZURE_B2C_CLIENT_SECRET=...
AZURE_B2C_TENANT_ID=...
MASTER_ENCRYPTION_KEY=<64-char-hex>
WALLET_ENCRYPTION_KEY=<64-char-hex>
SESSION_COOKIE_SECRET=<32-char-hex>

# Key Vault (production)
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# Card Providers
HIGHNOTE_API_KEY=<from-keyvault>
HIGHNOTE_API_SECRET=<from-keyvault>
HIGHNOTE_WEBHOOK_SECRET=<from-keyvault>
CARD_WEBHOOK_IPS=<comma-separated-ips>
```

---

## Next Steps

Run production build to verify all fixes:
```bash
npm run build
```

Expected result: Clean build with no errors, only optional dependency warnings.
