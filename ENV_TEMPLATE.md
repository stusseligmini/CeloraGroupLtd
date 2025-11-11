# 📝 Environment Variables (Azure Stack)

## Setup
1. Copy this template to `.env.local`
2. Replace placeholder values with your Azure credentials
3. Restart dev server `npm run dev`

---

```env
# ============================================================================
# PLATFORM ENDPOINTS
# ============================================================================
PLATFORM_API_BASE_URL=https://api.celora.azure
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EXTENSION_ORIGIN=chrome-extension://replace-with-extension-id

# ============================================================================
# AUTH (Azure AD B2C)
# ============================================================================
NEXT_PUBLIC_AZURE_B2C_TENANT=celora
NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN=celora.b2clogin.com
NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY=B2C_1_SUSI
NEXT_PUBLIC_AZURE_B2C_PASSWORD_RESET_POLICY=B2C_1_PASSWORDRESET
NEXT_PUBLIC_AZURE_B2C_CLIENT_ID=replace-with-b2c-spa-client-id
NEXT_PUBLIC_AZURE_B2C_API_SCOPE=https://celora.onmicrosoft.com/api/user_impersonation
NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_AZURE_B2C_LOGOUT_URI=http://localhost:3000

AZURE_B2C_CLIENT_ID=replace-with-b2c-confidential-client-id
AZURE_B2C_CLIENT_SECRET=replace-with-b2c-confidential-client-secret
AZURE_B2C_TENANT_ID=replace-with-azure-tenant-id

# ============================================================================
# STORAGE (Azure Storage Account)
# ============================================================================
AZURE_STORAGE_ACCOUNT=celorastorageprod
AZURE_STORAGE_KEY=replace-with-storage-key
AZURE_BLOB_CONTAINER=celora-artifacts

# ============================================================================
# NOTIFICATIONS / PUSH
# ============================================================================
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=replace-with-vapid-public-key
WEB_PUSH_PRIVATE_KEY=replace-with-vapid-private-key

# ============================================================================
# ENCRYPTION & SECURITY
# ============================================================================
MASTER_ENCRYPTION_KEY=generate-64-char-secret
WALLET_ENCRYPTION_KEY=generate-64-char-secret
SESSION_COOKIE_SECRET=generate-32-char-secret
PAYMENT_PROCESSOR_WEBHOOK_SECRET=replace-with-payment-processor-secret
AZURE_KEY_VAULT_URL=https://your-key-vault.vault.azure.net/
AZURE_REDIS_CONNECTION_STRING=replace-with-redis-connection-string

# ============================================================================
# SOLANA CONFIGURATION
# ============================================================================
SOLANA_RPC_URL=https://your-quicknode-mainnet-url
SOLANA_WSS_URL=wss://your-quicknode-mainnet-url
SOLANA_DEVNET_RPC_URL=https://your-quicknode-devnet-url
SOLANA_DEVNET_WSS_URL=wss://your-quicknode-devnet-url

# ============================================================================
# TELEMETRY & LOGGING
# ============================================================================
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.celora.azure
APPLICATION_INSIGHTS_CONNECTION_STRING=replace-with-appinsights-connection-string

# ============================================================================
# FEATURE FLAGS / DEFAULTS
# ============================================================================
ENABLE_SOLANA_INGESTION=true
ENABLE_FRAUD_MONITORING=true
CASHBACK_TOKEN=CELO
NODE_ENV=development
```

---

## 🔐 Key Generation Tips
- `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `openssl rand -hex 32`

## ⚠️ Notes
- Never commit `.env.local` to Git.
- Use separate secrets for staging vs. production.
- Ensure Azure AD B2C redirect URIs are registered for each environment.

## ✅ After Setup
1. `npm run dev`
2. Visit `http://localhost:3000`
3. Sign in via Azure AD B2C flow


