# Security Hardening (Non-Custodial Architecture)

Focus: Prevent key leakage, ensure transaction integrity, protect user privacy. All legacy cloud/vendor specific instructions removed.

## Core Principles
1. Client-side key generation only (BIP39 + local encryption).
2. Never transmit seed phrases, private keys, or decrypted material.
3. Server stores only public addresses, usernames, and non-sensitive metadata.
4. Minimal secrets surface: RPC keys, webhook tokens, third-party API keys.
5. Defense-in-depth for supply chain (lock dependency versions, verify signatures for critical libs).

## Threat Model
| Vector | Mitigation |
|--------|-----------|
| XSS stealing decrypted seed | Strict CSP, escape user content, segregate seed reveal route. |
| Malicious dependency exfiltration | Use `npm audit`, pin versions, review diff for crypto libs. |
| Phishing (fake wallet UI) | Clear branding, optional domain integrity banner. |
| Replay / fraud tx prompts | Require explicit user interaction per sign, display human-readable summary.
| Memory scraping (extension) | Minimize decrypted key lifetime; zeroize buffers after signing.

## Recommended Controls
### Application
- Content Security Policy: restrict scripts to self + required CDNs.
- Referrer Policy: `strict-origin-when-cross-origin`.
- Disable inline eval; use build-time hashing for script integrity if possible.

### Cryptography
- Seed phrase encryption: AES-GCM with PBKDF2 (≥100k iterations) or Argon2id.
- Split memory handling: derive key → decrypt seed → derive child keys → immediately zero seed buffer.

### Example Encryption Utility
```ts
import { subtle } from 'crypto'.webcrypto;

export async function encryptSeed(seed: string, password: string) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pwKey = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, pwKey, { name:'AES-GCM', length:256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(seed));
  return { salt: Buffer.from(salt).toString('hex'), iv: Buffer.from(iv).toString('hex'), data: Buffer.from(ciphertext).toString('base64') };
}
```

### Dependency Integrity
- Pin exact versions in `package.json`.
- Enable periodic script: `npm audit --json` → parse high severity.
- For critical crypto libs (bip39, ed25519), verify maintained status.

### Logging & Privacy
- Log only: request id, public address hash (truncate), operation type, duration.
- No PII, no private material.

### Incident Response
1. Detect anomaly (unexpected signing frequency).  
2. Disable affected feature flag.  
3. Publish security notice (Markdown advisory).  
4. Ship patch; require users to re-verify UI via checksum banner.

## Removed Legacy Sections
- Vendor-specific WAF setup.
- Vendor DDoS configuration.
- Vendor Key Vault usage guides.
- Platform-specific security center references.

## Checklist
- [ ] CSP enforced.
- [ ] Seed encryption tested.
- [ ] Signing flow reviewed.
- [ ] Dependencies audited.
- [ ] Minimal logs enabled.

## Status
Security posture aligned with non-custodial design. Expand only as complexity grows.


### Encryption Keys

**Rotation Frequency**: Quarterly (every 3 months)

**Keys to Rotate**:
- `MASTER_ENCRYPTION_KEY` - Master encryption key for sensitive data
- `WALLET_ENCRYPTION_KEY` - Wallet private key encryption
- `SESSION_COOKIE_SECRET` - Session cookie signing

**Procedure**:

1. **Generate New Keys**:
   ```bash
   # Generate 64-character hex key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store in Secret Manager**:
   Update environment variables in your hosting platform's secret management system.

3. **Update Environment Variables**:
   - Update `.env.local` for local development
   - Update hosting platform configuration
   - Update CI/CD pipeline variables

4. **Re-encrypt Existing Data** (if needed):
   ```typescript
   // Run migration script to re-encrypt data with new key
   npm run db:migrate:reencrypt
   ```

5. **Verify**:
   - Test encryption/decryption with new key
   - Verify existing data can still be decrypted
   - Monitor for errors in telemetry logs

### API Keys

**Rotation Frequency**: Monthly

**Keys to Rotate**:
- Card provider API keys (Gnosis Pay, Highnote)
- Blockchain RPC API keys
- Telegram bot token
- Payment processor webhook secrets

**Procedure**:

1. **Generate New API Key** from provider
2. **Update in Secret Manager**: Store in your hosting platform's environment variables

3. **Update Application Configuration**:
   - Update environment variables
   - Restart application services

4. **Verify**:
   - Test API calls with new key
   - Monitor for authentication errors
   - Keep old key active for 24 hours (grace period)

5. **Revoke Old Key** after verification

### Database Passwords

**Rotation Frequency**: Quarterly

**Procedure**:

1. **Generate New Password**:
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

2. **Update Database Password**: Use your database provider's console to update credentials

3. **Update `DATABASE_URL` in Secret Manager**:
   - Update `DATABASE_URL` in hosting platform environment variables
   - Update CI/CD pipeline variables

4. **Restart Application**:
   - Via hosting platform dashboard or CLI

5. **Verify**:
   - Check application logs for connection errors
   - Run health check endpoint
   - Verify database queries succeed

## WAF (Web Application Firewall) Configuration

**Non-Custodial Note**: Use your hosting platform's built-in WAF or CDN-level protection (Cloudflare, Vercel firewall, etc.). Configure:

1. **OWASP Core Rule Set**: Enable standard web attack protection
2. **Rate Limiting**: 100 requests per IP per minute for API endpoints
3. **Geo-blocking**: Optional based on regulatory requirements

Refer to your CDN/hosting provider documentation for configuration.

## DDoS Protection

**Non-Custodial Note**: Most hosting platforms (Vercel, Cloudflare) include DDoS protection by default. Verify:

1. DDoS mitigation is enabled in hosting platform settings
2. Alert thresholds configured for traffic spikes
3. Auto-scaling enabled to handle legitimate traffic surges

## Audit Log Review

### Audit Log Sources

1. **Application Logs**: Telemetry platform logs
2. **Database Logs**: PostgreSQL audit logs
3. **Authentication Logs**: Firebase Auth sign-in logs
4. **API Access Logs**: Request telemetry
5. **Security Events**: Hosting platform security events

### Weekly Review Checklist

**Review Frequency**: Every Monday

**Checklist**:

1. **Failed Authentication Attempts**: Review authentication logs for patterns of failed logins from same IP

2. **Unusual API Access Patterns**: Monitor API error rates by endpoint and client IP

3. **Privileged Operations**
   - Wallet creation
   - Card creation
   - Multisig wallet operations
   - Recovery operations

4. **Database Access**
   - Unusual query patterns
   - Failed connection attempts
   - Long-running queries

5. **Security Alerts**
   - Review hosting platform security alerts
   - Investigate any high-severity findings

### Automated Alerting

Configure alerts for suspicious activity using your monitoring platform (e.g., >10 failed login attempts from same IP within 5 minutes).

### Audit Log Retention

- **Application Logs**: 30 days (configurable per platform)
- **Database Logs**: 90 days (PostgreSQL)
- **Authentication Logs**: 90 days (Firebase Auth)
- **Security Events**: 1 year (hosting platform)

## Security Best Practices

### 1. Principle of Least Privilege

- Grant minimum required permissions
- Use managed identities where possible
- Rotate service principal credentials regularly

### 2. Defense in Depth

- Multiple layers of security (WAF, rate limiting, authentication)
- Encrypt data at rest and in transit
- Implement network segmentation

### 3. Regular Security Audits

- Quarterly security reviews
- Annual penetration testing
- Continuous vulnerability scanning

### 4. Incident Response

- Document incident response procedures
- Maintain security contact list
- Practice incident response drills

## Secret Rotation Script Template

Create `scripts/rotate-secrets.sh`:

```bash
#!/bin/bash
# Secret Rotation Script Template

set -euo pipefail

KEY_VAULT_NAME="celora-keyvault"
RESOURCE_GROUP="celora-rg"

# Function to rotate a secret
rotate_secret() {
  local secret_name=$1
  local new_value=$2
  
  echo "Rotating secret: $secret_name"
  
  # Store new secret in Key Vault
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --value "$new_value"
  
  # Update App Service configuration
  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name celora-webapp \
    --settings "$secret_name=$new_value"
  
  echo "Secret $secret_name rotated successfully"
}

# Example: Rotate master encryption key
# NEW_KEY=$(openssl rand -hex 32)
# rotate_secret "MASTER_ENCRYPTION_KEY" "$NEW_KEY"
```

## Compliance

### PCI DSS (if handling card data)

- Encrypt card data at rest (AES-256)
- Use TLS 1.2+ for data in transit
- Implement access controls and audit logging
- Regular security testing

### GDPR

- Encrypt personal data
- Implement data retention policies
- Provide data export/deletion capabilities
- Document data processing activities

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- Hosting platform-specific security documentation (Vercel, Cloudflare, etc.)

