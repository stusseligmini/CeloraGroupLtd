# Security & Privacy Review - New Components

**Review Date:** December 1, 2025  
**Scope:** Components and modules added for roadmap completion

---

## Components Reviewed

1. `src/lib/clientKeyManagement.ts`
2. `src/app/wallet/create/page.tsx`
3. `src/components/wallet/ReceiveAddress.tsx`
4. `src/lib/username/resolver.ts`
5. `src/components/swap/JupiterSwap.tsx`
6. `src/components/card/JupiterCard.tsx`

---

## Risk Assessment

### 1. Mnemonic/Private Key Exposure

**Risk Level:** 🔴 CRITICAL

#### Vulnerabilities Identified:
- **JupiterSwap.tsx**: Decrypts mnemonic in memory during signing (lines 137-141)
- **ReceiveAddress.tsx**: Decrypts mnemonic for address derivation (lines 70-76)
- **clientKeyManagement.ts**: `assertNoMnemonicLeak` only checks strings, not serialized objects

#### Mitigations Applied:
✅ Mnemonics never sent to server (client-side only)  
✅ Decryption only on user password entry  
✅ Variables cleared after use (not fully implemented)  
⚠️ **TODO:** Add explicit `mnemonic = ''` after signing in JupiterSwap  
⚠️ **TODO:** Implement React useEffect cleanup in swap component  
⚠️ **TODO:** Add console.log scanner in CI to detect accidental logging

#### Recommended Actions:
```typescript
// In JupiterSwap after signing:
finally {
  mnemonic = '';
  solWallet = null;
}

// Add to clientKeyManagement.ts:
export function sanitizeMemory(obj: any): void {
  if (typeof obj === 'string') obj = '';
  if (obj?.keypair) obj.keypair = null;
}
```

---

### 2. XSS via Iframe Injection

**Risk Level:** 🟡 MEDIUM

#### Vulnerabilities Identified:
- **JupiterCard.tsx**: Iframe `src` built from env vars (could be manipulated if env compromised)
- **JupiterCard.tsx**: postMessage origin check is strict but doesn't validate message schema

#### Mitigations Applied:
✅ Origin whitelist with hardcoded allowed domains  
✅ Iframe sandbox attributes restrict capabilities  
✅ CSP headers in middleware.ts (verified separately)  
⚠️ **PARTIAL:** Message data validation missing (trusts provider event structure)

#### Recommended Actions:
```typescript
// Add Zod schema validation for card events:
const CardEventSchema = z.object({
  type: z.enum(['CARD_ISSUED', 'TOP_UP_COMPLETE', 'WIDGET_ERROR', 'MODAL_CLOSED']),
  data: z.object({ cardId: z.string().optional(), amount: z.number().optional() }).optional(),
});

// In handleMessage:
const validated = CardEventSchema.safeParse(event.data);
if (!validated.success) {
  console.warn('Malformed card event', validated.error);
  return;
}
```

---

### 3. CSRF in API Calls

**Risk Level:** 🟢 LOW

#### Vulnerabilities Identified:
- Swap API calls lack explicit CSRF token (rely on middleware)
- Username resolution API has no rate limiting in resolver.ts (client-side)

#### Mitigations Applied:
✅ Middleware `csrfMiddleware` validates tokens on write operations  
✅ Idempotency keys in swap execution prevent duplicate transactions  
✅ Server-side rate limiting in place (from middleware audit)  
⚠️ **EDGE CASE:** Client-side resolver cache could be poisoned if API compromised

#### Recommended Actions:
- Verify `csrfMiddleware` applies to `/api/swap` route (check middleware config)
- Add cache TTL enforcement (current: 5min, recommend: add jitter to prevent thundering herd)

---

### 4. Username Enumeration

**Risk Level:** 🟡 MEDIUM

#### Vulnerabilities Identified:
- **resolver.ts**: Returns `NOT_FOUND` status exposes which usernames exist
- Timing attacks possible if resolution takes longer for existing users

#### Mitigations Applied:
✅ Caching reduces timing variance  
⚠️ **PARTIAL:** Status codes intentionally verbose for UX (trade-off accepted per roadmap)

#### Recommended Actions:
- Document decision: Username enumeration is acceptable risk for gambling wallet UX
- Consider adding fake delay randomization in production if abuse detected

---

### 5. Password Strength & Storage

**Risk Level:** 🟢 LOW (Well-Handled)

#### Vulnerabilities Identified:
- None significant

#### Mitigations Applied:
✅ PBKDF2 with 100k iterations for key derivation  
✅ Minimum password requirements enforced in UI  
✅ Encrypted data stored in localStorage (AES-GCM)  
✅ Salt and IV generated per wallet  

---

### 6. Dependency Supply Chain

**Risk Level:** 🟡 MEDIUM

#### Vulnerabilities Identified:
- `@solana/web3.js`, `qrcode.react`, `bip39` are external dependencies
- Jupiter API endpoint fetched from public URL (not pinned)

#### Mitigations Applied:
⚠️ **TODO:** Add `package-lock.json` integrity checks in CI  
⚠️ **TODO:** Consider subresource integrity (SRI) for Jupiter SDK if available

#### Recommended Actions:
```bash
# In CI/CD pipeline:
npm audit --production
npm outdated
# Fail build on critical vulnerabilities
```

---

### 7. Race Conditions in State Management

**Risk Level:** 🟡 MEDIUM

#### Vulnerabilities Identified:
- **JupiterSwap.tsx**: Multiple state updates during swap (building, broadcasting) could race
- **ReceiveAddress.tsx**: Unlock state change + address derivation not atomic

#### Mitigations Applied:
✅ Loading flags prevent double-submission  
⚠️ **PARTIAL:** No mutex/semaphore for critical sections

#### Recommended Actions:
```typescript
// Add ref-based locking in JupiterSwap:
const swapLock = useRef(false);
const performSwap = async () => {
  if (swapLock.current) return;
  swapLock.current = true;
  try {
    // ... swap logic
  } finally {
    swapLock.current = false;
  }
};
```

---

### 8. Sensitive Data in Browser DevTools

**Risk Level:** 🔴 CRITICAL

#### Vulnerabilities Identified:
- Decrypted mnemonics briefly exist in memory during signing
- React DevTools could expose component state if dev tools attached
- localStorage contains encrypted keys (acceptable) but keys visible in storage inspector

#### Mitigations Applied:
✅ Production builds strip React DevTools hooks  
✅ Encryption at rest for localStorage  
⚠️ **PARTIAL:** No runtime detection of DevTools presence

#### Recommended Actions:
- Add development-mode warning banner: "Never use real funds in dev mode"
- Consider obfuscation for mnemonic variables (trade-off: harder debugging)

---

## Summary Matrix

| Component | Mnemonic Risk | XSS Risk | CSRF Risk | Overall |
|-----------|---------------|----------|-----------|---------|
| clientKeyManagement | 🟡 Medium | N/A | N/A | 🟡 Medium |
| ReceiveAddress | 🟡 Medium | N/A | N/A | 🟡 Medium |
| JupiterSwap | 🔴 High | N/A | 🟢 Low | 🔴 High |
| JupiterCard | N/A | 🟡 Medium | N/A | 🟡 Medium |
| UsernameResolver | N/A | N/A | 🟢 Low | 🟢 Low |

---

## Prioritized Remediation Plan

### P0 (Critical - Implement Before Production):
1. **JupiterSwap memory cleanup**: Clear mnemonic variable after signing
2. **DevTools detection**: Add warning banner in development mode
3. **Dependency audit CI**: Automate `npm audit` in GitHub Actions

### P1 (High - Implement in Beta):
4. **Card event validation**: Add Zod schema for postMessage events
5. **Swap race condition lock**: Add ref-based mutex for `performSwap`
6. **Console.log scanner**: Grep for `console.log.*mnemonic` in pre-commit hook

### P2 (Medium - Monitor & Patch if Exploited):
7. **Username enumeration throttling**: Add fake delay jitter if abuse detected
8. **SRI for Jupiter SDK**: Pin version if available
9. **Cache poisoning defense**: Add signature verification for resolver responses

---

## Testing Recommendations

### Security-Focused Tests:
1. **Mnemonic leak detection**: Scan DOM for BIP39 wordlist patterns
2. **Origin bypass attempt**: Mock postMessage from unauthorized domain
3. **Password brute-force**: Verify PBKDF2 iteration count via timing
4. **Race condition**: Simulate rapid swap button clicks
5. **localStorage inspection**: Verify encrypted data not reversible without password

### Penetration Testing Checklist:
- [ ] Attempt XSS via malicious username input
- [ ] Intercept Jupiter widget postMessage and inject fake CARD_ISSUED event
- [ ] Replay idempotency key to test duplicate swap prevention
- [ ] Inspect network tab for mnemonic transmission (should be zero)
- [ ] Test localStorage export → import in different browser (encryption portability)

---

## Compliance Notes

**Non-Custodial Verification:**
✅ Server never receives private keys (verified in all components)  
✅ Encryption happens client-side only  
✅ Signing happens in browser/client context  

**Privacy:**
✅ No PII collected beyond username (optional)  
✅ Addresses are public blockchain data (no privacy concern)  
⚠️ IP addresses logged in server requests (standard; document in privacy policy)

**Regulatory:**
✅ No money transmission (crypto-to-crypto only)  
✅ Card providers handle KYC (Jupiter/Kado responsible)  

---

**Review Completed By:** AI Assistant  
**Next Review:** After beta testing feedback (Jan 2026)  
**Escalation Contact:** Security team for P0 items
