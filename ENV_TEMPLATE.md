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
# DATABASE
# ============================================================================
DATABASE_URL=postgresql://user:password@localhost:5432/celora
DIRECT_DATABASE_URL=postgresql://user:password@localhost:5432/celora

# ============================================================================
# TELEGRAM BOT
# ============================================================================
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_SECRET=generate-32-char-secret
TELEGRAM_BOT_ENABLED=true
TELEGRAM_WEBHOOK_URL=https://app.celora.com/api/telegram/webhook

# ============================================================================
# CARD ISSUING PROVIDERS
# ============================================================================
# Mock Provider (always available for development)
# No configuration needed
CARD_PROVIDER=mock

# Gnosis Pay (crypto-native cards)
GNOSIS_PAY_ENABLED=false
GNOSIS_PAY_API_BASE_URL=https://api.sandbox.gnosis-pay.com
GNOSIS_PAY_API_KEY=your-gnosis-pay-api-key
GNOSIS_PAY_API_SECRET=your-gnosis-pay-api-secret
GNOSIS_PAY_WEBHOOK_SECRET=generate-32-char-secret
GNOSIS_CHAIN_RPC_URL=https://rpc.gnosischain.com
GNOSIS_SAFE_ADDRESS=your-gnosis-safe-address

# Highnote (traditional fiat cards)
HIGHNOTE_API_BASE_URL=https://api.sandbox.highnote.com/v1
HIGHNOTE_API_KEY=your-highnote-api-key
HIGHNOTE_API_SECRET=your-highnote-api-secret
HIGHNOTE_WEBHOOK_SECRET=generate-32-char-secret
HIGHNOTE_PROGRAM_ID=your-highnote-program-id

# Deserve (backup provider)
DESERVE_API_BASE_URL=https://api.sandbox.deserve.com
DESERVE_API_KEY=your-deserve-api-key

# Card Encryption
ENCRYPTION_KEY=generate-64-char-secret
ENCRYPTION_SALT=generate-32-char-secret

# ============================================================================
# WEB3 & DAPP INTEGRATION
# ============================================================================
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# ============================================================================
# NFT SERVICES
# ============================================================================
ALCHEMY_API_KEY=your-alchemy-api-key
# Optional alternatives:
# MORALIS_API_KEY=your-moralis-api-key
# QUICKNODE_API_KEY=your-quicknode-api-key

# ============================================================================
# BLOCKCHAIN RPC ENDPOINTS
# ============================================================================
# Ethereum
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Polygon
POLYGON_RPC_URL=https://polygon-rpc.com

# Arbitrum
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optimism
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Celo (already configured above for Gnosis Pay)

# ============================================================================
# DEFI SERVICES
# ============================================================================
# Jupiter (Solana DEX aggregator) - No API key needed
JUPITER_API_URL=https://quote-api.jup.ag/v6

# 1inch (EVM DEX aggregator) - Optional
ONE_INCH_API_KEY=your-1inch-api-key

# DeFi Llama (for position tracking) - No API key needed
DEFILLAMA_API_URL=https://api.llama.fi

# ============================================================================
# MOBILE APP (REACT NATIVE)
# ============================================================================
# Firebase (for push notifications)
FCM_SERVER_KEY=your-fcm-server-key
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apns-team-id
APNS_KEY_PATH=./apns-key.p8

# Mobile API endpoint
MOBILE_API_BASE_URL=https://api.celora.com

# ============================================================================
# APPLE PAY / GOOGLE PAY PROVISIONING
# ============================================================================
APPLE_PAY_MERCHANT_ID=merchant.com.celora.wallet
APPLE_PAY_CERTIFICATE_PATH=./apple-pay-cert.pem
GOOGLE_PAY_MERCHANT_ID=your-google-pay-merchant-id
GOOGLE_PAY_API_KEY=your-google-pay-api-key

# ============================================================================
# AI & ANALYTICS (PHASE B - Optional)
# ============================================================================
# OpenAI (for enhanced insights) - Leave empty for rule-based AI
OPENAI_API_KEY=
AI_USE_ML_MODELS=false

# ============================================================================
# KYC/AML PROVIDERS (PHASE B - Optional)
# ============================================================================
# Sumsub
SUMSUB_APP_TOKEN=
SUMSUB_SECRET_KEY=
SUMSUB_ENABLED=false

# Onfido
ONFIDO_API_TOKEN=
ONFIDO_ENABLED=false

# ============================================================================
# PREMIUM SERVICES (PHASE B - Optional)
# ============================================================================
# Premium RPC endpoints
PREMIUM_RPC_ENABLED=false
QUICKNODE_ENDPOINT=
ALCHEMY_PREMIUM_KEY=

# ============================================================================
# FEATURE FLAGS / DEFAULTS
# ============================================================================
ENABLE_SOLANA_INGESTION=true
ENABLE_FRAUD_MONITORING=true
CASHBACK_TOKEN=CELO
NODE_ENV=development

# Hardware Wallets
LEDGER_ENABLED=true
TREZOR_ENABLED=true

# Social Features
USERNAME_ENABLED=true
PAYMENT_REQUESTS_ENABLED=true
SPLIT_BILLS_ENABLED=true

# Multi-Sig
MULTISIG_ENABLED=true
SOCIAL_RECOVERY_ENABLED=true
MULTISIG_ONCHAIN_ENABLED=false
SOCIAL_RECOVERY_ONCHAIN_ENABLED=false
MULTISIG_FACTORY_ADDRESS=0xa6B71E26C5e0845f74c5001100ceB4b907a3dAB0
MULTISIG_SINGLETON_ADDRESS=0xd9Db270C1B5E3Bd161E8c8503c55ceABeE709552
MULTISIG_FALLBACK_HANDLER=0x0000000000000000000000000000000000000000
# Per-chain overrides (optional)
# ETHEREUM_MULTISIG_FACTORY_ADDRESS=
# POLYGON_MULTISIG_FACTORY_ADDRESS=
# ARBITRUM_MULTISIG_FACTORY_ADDRESS=
# OPTIMISM_MULTISIG_FACTORY_ADDRESS=
# CELO_MULTISIG_FACTORY_ADDRESS=
SOCIAL_RECOVERY_CONTRACT_ADDRESS=
# Chain-specific overrides
# SOCIAL_RECOVERY_CONTRACT_ADDRESS_ETHEREUM=
# SOCIAL_RECOVERY_CONTRACT_ADDRESS_POLYGON=
# SOCIAL_RECOVERY_CONTRACT_ADDRESS_ARBITRUM=
# SOCIAL_RECOVERY_CONTRACT_ADDRESS_OPTIMISM=
# SOCIAL_RECOVERY_CONTRACT_ADDRESS_CELO=

# Spending Controls
SPENDING_LIMITS_ENABLED=true
SCHEDULED_PAYMENTS_ENABLED=true

# DeFi
STAKING_ENABLED=true
SWAP_ENABLED=true
DEFI_POSITIONS_ENABLED=true

# Physical Cards
PHYSICAL_CARDS_ENABLED=false

# Wallet Provisioning
APPLE_PAY_ENABLED=false
GOOGLE_PAY_ENABLED=false
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


