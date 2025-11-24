# Vercel Environment Variables Setup

Gå til: https://vercel.com/celora-wallet-v5s-projects/celora-group-ltd/settings/environment-variables

## 1. Database Setup (KRITISK - Gjør først!)

### Opprett Vercel Postgres Database:
1. Gå til Storage tab i Vercel dashboard
2. Klikk "Create Database" → "Postgres"
3. Navn: `celora-production`
4. Dette setter automatisk:
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_PRISMA_URL`

### Legg til manuelt (hvis ikke automatisk):
```
DATABASE_URL = (kopier POSTGRES_PRISMA_URL)
DIRECT_DATABASE_URL = (kopier POSTGRES_URL_NON_POOLING)
```

## 2. Encryption Keys (KRITISK)

**Environment:** Production, Preview, Development

```
MASTER_ENCRYPTION_KEY
74f0037b0f1c4a059b2bd21e6eab515140018fd7bdbd55f78463244fcee65a18

WALLET_ENCRYPTION_KEY
e673e0175990667f6dd6e4ec331c308cf1b985a8046af6732c2421e17cc32e6d

SESSION_COOKIE_SECRET
4fad6dc3d38dcc1cccc98fc1007977a8

ENCRYPTION_KEY
72e1959249461b66b4d5a9e06aba0289b33874ec99dca2934f25c909009273cb

ENCRYPTION_SALT
0c29fd9635ea4dfeb2cee894fd8abbbc8971ef87552f6a3c66f0e13b08d081ee
```

## 3. Firebase Admin (KRITISK)

**Environment:** Production, Preview, Development

**Navn:** `FIREBASE_SERVICE_ACCOUNT`

**Verdi:** (Kopier hele JSON-innholdet under som én linje eller multiline)
```json
{"type":"service_account","project_id":"celora-7b552","private_key_id":"d182690938378662cceb67cb33f5e35075540b1c","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+FdQt/BkW/0yc\nCzDBp0Cx1byb0WYNEkRyR9qk9CcJY6opB5c/Z3PiATGfBsh/+0L4lKHcsA84ALVY\nkumtCX9Fxrhu3DTSr7l3vsjzjh7E9rBjP3O53rwRP917kFRaDVnTrUqrraZyc4jm\noCNQpODO5DgiBTIxCtLDfpq0Bwmvfliy93Tbx05bhOMGYOHC7zxB3TBtZxssJZtk\ncpDqTgorce/X2dawMAXGMnii7t4EyyukRNakKLSKqiGQg/meRxvfsqp0HzG9n+zK\nv+M0BVxGrKOR4PRBXHHITbY0dWYmQnRbztbafQRXZECSp8MrIQ2CbDFbbI/sm/ys\nptrOEHWnAgMBAAECggEAAJvPSMwX5igpiCkdAx2DnNTlDTu5aO0zDBBP/h6xYRhD\ntIftN66Yv9AjKmEHp6KDo5eYWKlXBalAZKj/+WKnMFsclkcgb1R5co1/JhB+D/4E\n9Fq23hfbljHryV08JxDSFqby0Lt80Yb/LQ/41WWIfXpcbzrR+g71tUakqLFUcdHf\n9FATVExcioB7nWlhstIoG7E45l3tLA+p9n22kQRz77MC9IJQ2iNpCMKTHhrFfZNt\nNxJaWT5TMPmyDIuGvQkWltgvg0N+OClN9fF+Ww+55pztoGrZGGXIev1zXL+gRqu4\nrztzRSyfc3X/zRv2FM28KLEfHtljcRd/UXK20UdwYQKBgQD5EL3Yy6lN4IOirJU2\ngrkOkNUkcAhrxM3tCXOQ52FDM3BCCwqwb/JUCsVpIdpvQuS68Unh1BOUcZ2FVOmH\nyNAz+4d5kmosCwBYrq3911ceU6AJKQtAbBJDbcsfZ0FzhQPig/cAE6+rmKL6U8px\nosTQPT/RIPDbQTq5iBAoSBZ/kQKBgQDDYLId0ngGnlrO9WCgiaaAcrssRjOmXYan\nCgn5RvZmmTvja9g2MtKDGfgHa4M8s0wlGHF8h1jZS2YF8qqqKm5wSdQzrCZnRGFG\nkHCPWgMsAbRovWV7erYScVL3QcF/dmuYk89kfmB01J1Rm0s0OCGItVMhRoLtbAQb\n6e0/Z851twKBgQDVoHp1vRnWZkACA61oN++qgqeOvVk7tm46ZeTt4MgX78LVosrk\nUuCzHRn99r94txOhFNyeCl1Q8bJ+bjpv8NpD+/ZTXDYc2MLPTeSG2XEr3eZidQXl\nl8yCcWXL5bDJ+MlAPJhbRIdk02LW+4+ksEvHoQFfyrVMGkLYZ9AT/ODvQQKBgC21\nHXZkmrfRrCTmuuhTy6QZMzi0Y7j0AGBrtNGgjFyMVLprrHVhhmYtWR1DRbyZpaK4\nCTS85UhQn1mc39hXfObAHujHyWQ3VxqPCAZBZKSS8YXfaTJuDtJZuLMnqwEKzzku\nu0IjXqV2aCeDUSCyUQYOhZgvSsoIjx2IqHxA6MgZAoGACwKBwW0Afs2AiWPB6SmD\nPZT4HBGZLgVpPvBz2rg8tvNazfQ8fpjd4IRQ3ePjg+h0SSttYwOaWZTr8fqW60iA\nY8EeVUayHnMuIVq6qXpRHqvFn4rWyVbYJqK5P/VTAT8kXK/W4DlnzoNWYs59X6mV\nVkpyfih8vupxX4dVseo3clc=\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@celora-7b552.iam.gserviceaccount.com","client_id":"100548466716304547385","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40celora-7b552.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

## 4. Telegram Bot (Valgfritt - hvis du bruker det)

**Environment:** Production

```
TELEGRAM_BOT_TOKEN
8301647284:AAEokG0LTh2KKoNUqkgqugCO_iOeSPD2FfY

TELEGRAM_WEBHOOK_SECRET
127c3244062fc5697c905bc0f0812ccd206eb6f7eda313983aa421b9bd0e233b

TELEGRAM_BOT_ENABLED
true
```

## 5. Node Environment

**Environment:** Production
```
NODE_ENV
production
```

## 6. App URLs (Etter første deployment)

**Environment:** Production

```
NEXT_PUBLIC_APP_URL
https://celora-group-ltd.vercel.app

NEXT_PUBLIC_API_BASE_URL
https://celora-group-ltd.vercel.app

NEXT_PUBLIC_VERCEL_URL
celora-group-ltd.vercel.app
```

## 7. Card Provider (Mock for testing)

**Environment:** Production, Preview, Development

```
CARD_PROVIDER
mock

CASHBACK_TOKEN
CELO
```

---

## Etter at alle variables er satt:

1. **Deploy på nytt:**
   ```bash
   vercel --prod
   ```

2. **Kjør database migrations:**
   - Vercel vil automatisk kjøre `prisma migrate deploy` under build (fra vercel-build script)

3. **Verifiser deployment:**
   - Sjekk at build lykkes
   - Test `/api/diagnostics/health` endpoint

---

## Valgfrie Variables (Legg til senere)

### WalletConnect (for dApp connections)
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
<fra https://cloud.walletconnect.com/>
```

### Better RPC Endpoints (anbefalt for production)
```
SOLANA_RPC_URL
<QuickNode eller Alchemy URL>

ETHEREUM_RPC_URL
<Alchemy URL>
```

### Alchemy API (for NFTs og advanced features)
```
ALCHEMY_API_KEY
<fra https://dashboard.alchemy.com/>
```

---

## Quick Start Checklist:

- [ ] Opprett Vercel Postgres database
- [ ] Legg til encryption keys (5 stk)
- [ ] Legg til FIREBASE_SERVICE_ACCOUNT
- [ ] Legg til NODE_ENV=production
- [ ] Legg til CARD_PROVIDER=mock
- [ ] Deploy: `vercel --prod`
- [ ] Verifiser at build lykkes
- [ ] Test applikasjonen

**Minimum 8 variables må være satt for at build skal lykkes!**
