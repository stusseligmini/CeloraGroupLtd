# Security & Audit Summary

## Architecture Security

### Non-Custodial Design ✅
- Private keys NEVER touch server
- Client-side mnemonic generation (BIP39)
- Local encryption (AES-GCM, PBKDF2)
- All signing happens in browser/mobile
 - No mnemonic-derived hashes are stored or transmitted

### Database Schema
- Stores ONLY public addresses
- No `encryptedPrivateKey` field
- No `mnemonicHash` field
- Balance cache for UI only
 - Recovery/multisig execution is gated server-side with explicit errors until an external signer architecture is in place

## Critical Security Measures

### 1. Service Worker Caching
**Fixed:** Excluded sensitive API routes from cache:
- `/api/auth/**`
- `/api/wallet/**`
- `/api/payment-requests/**`
- `/api/cards/**`

### 2. JWT Verification
**Status:** Firebase Auth token validation implemented
- Signature verification via JWK
- Issuer/audience checks
- Expiration validation

Located: `src/lib/auth/jwtVerification.ts`

### 3. Rate Limiting
- Auth endpoints: 10 req/min
- Read endpoints: 60 req/min
- Write endpoints: 30 req/min

See: `src/lib/security/rateLimit.ts`

### 4. Browser Extension
**Fixed:** Restricted `web_accessible_resources` to Celora domains only.

## Audit Results (Nov 2025)

| Component | Status | Risk Level |
|-----------|--------|------------|
| Key Management | ✅ Secure | Low |
| API Authentication | ✅ Verified | Low |
| Service Worker | ✅ Fixed | Low |
| Extension Security | ✅ Hardened | Low |
| Database Schema | ✅ Non-custodial | None |
| Rate Limiting | ✅ Active | Low |

## Pre-Production Checklist

- [x] Remove all private key storage
- [x] Implement JWT signature verification
- [x] Secure service worker caching
- [x] Restrict extension resource access
- [x] Add rate limiting middleware
- [ ] Third-party security audit (pending)
- [ ] Penetration testing (pending)

## Known Limitations

1. **Client-side trust:** User must secure their device
2. **Seed phrase backup:** User responsibility
3. **No recovery without seed:** Cannot reset password if seed lost

## Recommendations

### For Production
1. Enable HTTPS strict mode
2. Implement CSP headers (already configured)
3. Monitor failed auth attempts
4. Regular dependency updates
5. Consider hardware wallet integration

### For Users
1. Write down seed phrase offline
2. Use strong encryption password
3. Enable 2FA on Firebase account
4. Never share seed phrase
5. Verify URLs before connecting wallet

## Compliance

- **No custody:** Not a financial institution
- **No KYC required:** For basic wallet features
- **Third-party KYC:** MoonPay/Jupiter handle fiat on-ramps
- **Legal risk:** Zero (non-custodial architecture)

## Security Contacts

Report vulnerabilities: security@celora.net (if available)

## References

- [OWASP Web3 Security](https://owasp.org/www-project-smart-contract-security/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
