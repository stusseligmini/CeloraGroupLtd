# Security Audit Summary (Non-Custodial)

## Scope
Evaluate current implementation for risks around key handling, transaction integrity, and user data exposure. Legacy vendor-specific findings removed.

## Fixes Implemented
1. Service worker restricted to static asset caching; excluded dynamic API routes.
2. Removed any server-side private key storage logic.
3. Implemented client-only seed phrase generation & encryption.
4. Hardened CSP directives to limit script origins.
5. Added lockfile regeneration to eliminate unused legacy packages.

## Residual Risk (Current)
| Area | Risk | Mitigation Plan |
|------|------|-----------------|
| Dependency supply chain | Medium | Weekly audit + pin versions |
| User mishandles seed phrase | High | Improved onboarding + backup education |
| RPC outage | Medium | Fallback endpoint + exponential backoff |
| XSS attempt | Low | Strict CSP + escape + React default sanitization |

## Key Handling Flow
```
User Action → Generate Mnemonic → Derive Keys → Encrypt → Store Encrypted Locally
Sign Tx → Decrypt (ephemeral) → Sign → Zeroize Buffers → Discard Plaintext
```

## Logging Policy
- No seed phrases, private keys, decrypted material.
- Public address hashed/truncated if stored.
- Errors include correlation id only.

## Next Actions
- [ ] Add optional hardware wallet support (Phantom compatible).
- [ ] Integrate encryption self-test (random round-trip) on app start.
- [ ] Add security banner summarizing non-custodial model.

## Verdict
System aligns with non-custodial principles; primary focus moving forward: user education & dependency vigilance.


**Impact:** Build stability improved, cleaner deployments

### 3. Browser Extension Security ✅
**Issue:** Extension `web_accessible_resources` allowed `<all_urls>` - any website could load extension assets.

**Fix:**
- Narrowed to only Celora production domains

**Risk Reduced:** Medium → Low

### 4. JWT Signature Verification ✅
**Issue:** Auth relied on unsigned JWT decoding (`decodeJwt`) - no signature validation.

**Fix:**
- Created `src/lib/auth/jwtVerification.ts` with Firebase Auth JWK validation using `jose`
- Validates issuer, audience, expiration, and signature
- Available for critical operations (use `verifyTokenWithSignature` instead of `decodeJwt`)

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
   - Production: Use Redis-backed rate limiting or hosting platform WAF
   - Config: Set rate limits per endpoint in platform configuration

3. **Prisma Migration Hygiene:**
   - Current: Used `db push` + manual migration marking
   - Recommended: Generate proper migration from current schema:
     ```bash
     npx prisma migrate dev --name initial_schema
     ```
   - Deploy to production with `prisma migrate deploy`

4. **Secret Management:**
   - Configure environment variables via hosting platform
   - Verify secrets are properly loaded in test environment
   - Test with: `npm run dev` and check logs for configuration

### Low Priority
5. **Bundle Optimization:**
   - Lazy-load `WalletConnectManager` (only on dApp pages)
   - Dynamic import `multisig` page (107 kB route)
   - Consider code-splitting vendor chunks further

6. **Telemetry Build Warnings:**
   - Optional dependencies missing: `pino-pretty`
   - Non-blocking; add to `package.json` or suppress warnings with:
     ```json
     "devDependencies": {
       "pino-pretty": "^11.0.0"
     }
     ```

7. **CSP Reporting:**
   - Add `report-uri` or `report-to` directive to CSP in production
   - Monitor violations in telemetry platform

---

## Security Posture Summary

| Area | Before | After | Status |
|------|--------|-------|--------|
| Service Worker Caching | High Risk | Low Risk | ✅ Fixed |
| JWT Validation | No Signature Check | JWK Verification Available | ⚠️ Ready (implement on routes) |
| CSRF Protection | Good | Good | ✅ Solid |
| CSP | Strong | Strong | ✅ Solid |
| Rate Limiting | In-Memory | In-Memory | ⚠️ Scale with Redis |
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
- [ ] Configure hosting platform rate limiting (production)
- [ ] Set secrets in hosting platform environment variables
- [ ] Generate clean Prisma migration for production
- [ ] Test service worker with dev tools (no sensitive data cached)
- [ ] Verify Firebase Auth JWK endpoint is reachable

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

Ensure these are set in hosting platform environment variables:

```bash
# Required
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
MASTER_ENCRYPTION_KEY=<64-char-hex>
WALLET_ENCRYPTION_KEY=<64-char-hex>
SESSION_COOKIE_SECRET=<32-char-hex>

# Card Providers
HIGHNOTE_API_KEY=...
HIGHNOTE_API_SECRET=...
HIGHNOTE_WEBHOOK_SECRET=...
CARD_WEBHOOK_IPS=<comma-separated-ips>
```

---

## Next Steps

Run production build to verify all fixes:
```bash
npm run build
```

Expected result: Clean build with no errors, only optional dependency warnings.
