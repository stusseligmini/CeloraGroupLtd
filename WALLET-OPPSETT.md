# 💼 Wallet Oppsett - Hva Må Gjøres Etter Oppsettet

Etter at du har fullført `KOMPLETT-OPPSETT.md`, må du gjøre noen ekstra steg for at wallet-funksjonaliteten skal fungere.

---

## ✅ Hva Er Allerede Implementert

Wallet-funksjonaliteten er **allerede implementert** i koden:
- ✅ Database schema for wallets (Ethereum, Bitcoin, Solana, Celo)
- ✅ API endpoints for wallet-operasjoner
- ✅ Frontend komponenter (WalletOverview, etc.)
- ✅ Kryptering av private keys
- ✅ Multi-chain støtte
- ✅ Hardware wallet støtte (Ledger, Trezor)

---

## 🔐 STEG 1: Sett Opp Azure AD B2C (Autentisering)

**Hvorfor:** Brukere må kunne logge inn for å bruke wallets. Appen bruker Azure AD B2C for autentisering.

### Hvordan:

1. **Gå til Azure Portal:**
   - Åpne: https://portal.azure.com
   - Søk etter "Azure AD B2C" i søkefeltet

2. **Opprett B2C Tenant (hvis du ikke har en):**
   - Klikk "Create a resource"
   - Søk etter "Azure Active Directory B2C"
   - Klikk "Create"
   - Følg guiden for å opprette tenant

3. **Opprett App Registration:**
   - I B2C tenant, gå til "App registrations"
   - Klikk "New registration"
   - Navn: `Celora Web App`
   - Supported account types: "Accounts in any identity provider or organizational directory"
   - Redirect URI: 
     - Type: "Single-page application (SPA)"
     - URI: `http://localhost:3000` (for lokal utvikling)
     - Legg også til: `https://celora-web-staging.azurewebsites.net` (for staging)
     - Legg også til: `https://celora-web-prod.azurewebsites.net` (for production)
   - Klikk "Register"

4. **Kopier Client ID:**
   - På "Overview" siden, kopier "Application (client) ID"
   - Du trenger denne i neste steg

5. **Opprett User Flows:**
   - Gå til "User flows" i venstre meny
   - Klikk "New user flow"
   - Velg "Sign up and sign in"
   - Navn: `B2C_1_SUSI` (eller hva du vil)
   - Identity providers: Huk av "Email signup"
   - User attributes: Velg hva du vil samle inn (email, display name, etc.)
   - Application claims: Velg hva du vil returnere (email, display name, etc.)
   - Klikk "Create"

6. **Opprett Password Reset Flow:**
   - Klikk "New user flow" igjen
   - Velg "Password reset"
   - Navn: `B2C_1_PASSWORDRESET`
   - Følg samme prosess som over

7. **Opprett API Scope (for backend):**
   - Gå til "App registrations" → Din app
   - Klikk "Expose an API"
   - Klikk "Set" ved Application ID URI
   - Legg til scope:
     - Scope name: `user_impersonation`
     - Admin consent display name: `Access Celora API`
     - Admin consent description: `Allow the application to access Celora API on behalf of the signed-in user`
     - Klikk "Add scope"

---

## 🔧 STEG 2: Oppdater Miljøvariabler

### For Lokal Utvikling (.env.local):

Legg til disse i `.env.local`:

```env
# Azure AD B2C Configuration
NEXT_PUBLIC_AZURE_B2C_TENANT=din-tenant-navn
NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN=din-tenant.b2clogin.com
NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY=B2C_1_SUSI
NEXT_PUBLIC_AZURE_B2C_PASSWORD_RESET_POLICY=B2C_1_PASSWORDRESET
NEXT_PUBLIC_AZURE_B2C_CLIENT_ID=din-client-id-fra-steg-1.4
NEXT_PUBLIC_AZURE_B2C_API_SCOPE=https://din-tenant.onmicrosoft.com/api/user_impersonation
NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_AZURE_B2C_LOGOUT_URI=http://localhost:3000

# Backend B2C (for API calls)
AZURE_B2C_CLIENT_ID=din-client-id-fra-steg-1.4
AZURE_B2C_CLIENT_SECRET=din-client-secret
AZURE_B2C_TENANT_ID=din-tenant-id
```

**Hvor finner du disse verdiene:**
- `NEXT_PUBLIC_AZURE_B2C_TENANT`: Tenant navnet (f.eks. `celora`)
- `NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN`: Vanligvis `din-tenant.b2clogin.com`
- `NEXT_PUBLIC_AZURE_B2C_CLIENT_ID`: Fra steg 1.4 (Application ID)
- `AZURE_B2C_TENANT_ID`: Fra Azure AD → Overview → Tenant ID

**For Client Secret:**
- Gå til "App registrations" → Din app → "Certificates & secrets"
- Klikk "New client secret"
- Beskrivelse: `Celora Backend Secret`
- Expires: Velg en passende periode
- Klikk "Add"
- **Kopier secret VERDI** (du ser den bare én gang!)

### For Azure Web Apps:

Sett disse environment variables i Azure Portal:

```bash
# For STAGING
az webapp config appsettings set \
  --name celora-web-staging \
  --resource-group rg-celora-staging-primary \
  --settings \
    NEXT_PUBLIC_AZURE_B2C_TENANT="din-tenant" \
    NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN="din-tenant.b2clogin.com" \
    NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY="B2C_1_SUSI" \
    NEXT_PUBLIC_AZURE_B2C_PASSWORD_RESET_POLICY="B2C_1_PASSWORDRESET" \
    NEXT_PUBLIC_AZURE_B2C_CLIENT_ID="din-client-id" \
    NEXT_PUBLIC_AZURE_B2C_API_SCOPE="https://din-tenant.onmicrosoft.com/api/user_impersonation" \
    NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI="https://celora-web-staging.azurewebsites.net" \
    NEXT_PUBLIC_AZURE_B2C_LOGOUT_URI="https://celora-web-staging.azurewebsites.net" \
    AZURE_B2C_CLIENT_ID="din-client-id" \
    AZURE_B2C_CLIENT_SECRET="din-client-secret" \
    AZURE_B2C_TENANT_ID="din-tenant-id"

# For PRODUCTION
az webapp config appsettings set \
  --name celora-web-prod \
  --resource-group rg-celora-prod-primary \
  --settings \
    NEXT_PUBLIC_AZURE_B2C_TENANT="din-tenant" \
    NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN="din-tenant.b2clogin.com" \
    NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY="B2C_1_SUSI" \
    NEXT_PUBLIC_AZURE_B2C_PASSWORD_RESET_POLICY="B2C_1_PASSWORDRESET" \
    NEXT_PUBLIC_AZURE_B2C_CLIENT_ID="din-client-id" \
    NEXT_PUBLIC_AZURE_B2C_API_SCOPE="https://din-tenant.onmicrosoft.com/api/user_impersonation" \
    NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI="https://celora-web-prod.azurewebsites.net" \
    NEXT_PUBLIC_AZURE_B2C_LOGOUT_URI="https://celora-web-prod.azurewebsites.net" \
    AZURE_B2C_CLIENT_ID="din-client-id" \
    AZURE_B2C_CLIENT_SECRET="din-client-secret" \
    AZURE_B2C_TENANT_ID="din-tenant-id"
```

---

## 🧪 STEG 3: Test Lokalt

1. **Start appen:**
   ```bash
   npm run dev
   ```

2. **Åpne nettleser:**
   - Gå til: http://localhost:3000

3. **Test innlogging:**
   - Klikk "Sign in" eller "Sign up"
   - Du skal bli sendt til Azure B2C login side
   - Opprett en testbruker eller logg inn
   - Du skal bli sendt tilbake til appen

4. **Test wallet:**
   - Etter innlogging skal du se WalletOverview komponenten
   - Du kan nå opprette wallets via UI (når det er implementert)
   - Eller via API (se nedenfor)

---

## 💰 STEG 4: Opprett Din Første Wallet

### Via API (for testing):

1. **Hent access token:**
   - Etter innlogging, åpne browser Developer Tools (F12)
   - Gå til "Application" → "Local Storage"
   - Se etter `msal.account.keys` eller lignende
   - Eller bruk Network tab for å se API calls

2. **Opprett wallet via API:**
   ```bash
   curl -X POST http://localhost:3000/api/wallet/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer DIN-ACCESS-TOKEN" \
     -H "x-user-id: DIN-USER-ID" \
     -d '{
       "blockchain": "ethereum",
       "label": "My First Wallet"
     }'
   ```

### Via UI (når implementert):

- UI for wallet-opprettelse vil være tilgjengelig etter at autentisering fungerer
- Se `src/components/WalletOverview.tsx` for eksisterende komponenter

---

## 🔗 STEG 5: Konfigurer Blockchain RPC Endpoints

For at wallets skal fungere, trenger appen tilgang til blockchain RPC endpoints.

### Oppdater .env.local:

```env
# Ethereum
ETHEREUM_RPC_URL=https://eth.llamarpc.com
# Eller bruk en premium provider:
# ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/DIN-INFURA-KEY

# Polygon
POLYGON_RPC_URL=https://polygon-rpc.com

# Arbitrum
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optimism
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Celo
CELO_RPC_URL=https://forno.celo.org

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Eller premium:
# SOLANA_RPC_URL=https://DIN-ENDPOINT.quicknode.com

# Bitcoin (via Electrum server eller API)
BITCOIN_RPC_URL=https://blockstream.info/api
```

**Gratis alternativer:**
- De fleste har gratis public RPC endpoints
- For produksjon, vurder premium providers (Infura, Alchemy, QuickNode)

**For Azure Web Apps:**
Legg til disse i Azure Portal → Web App → Configuration → Application settings

---

## ✅ Verifisering

### Sjekkliste:

- [ ] Azure B2C tenant opprettet
- [ ] App registration opprettet med redirect URIs
- [ ] User flows opprettet (sign in, password reset)
- [ ] API scope opprettet
- [ ] Client secret opprettet og lagret
- [ ] Miljøvariabler satt i .env.local
- [ ] Miljøvariabler satt i Azure Web Apps
- [ ] Kan logge inn lokalt
- [ ] Kan logge inn på staging
- [ ] Kan logge inn på production
- [ ] RPC endpoints konfigurert

---

## 🎯 Hva Kan Du Nå Gjøre?

Etter at alt er satt opp, kan du:

1. **Logge inn:**
   - Brukere kan opprette konto via Azure B2C
   - Logge inn med email/passord

2. **Opprette wallets:**
   - Ethereum wallets
   - Bitcoin wallets
   - Solana wallets
   - Celo wallets
   - Multi-chain wallets

3. **Sende/motta crypto:**
   - Når wallet er opprettet, kan brukere sende og motta
   - QR-kode generering for mottak
   - Transaksjonshistorikk

4. **Bruke virtual cards:**
   - Opprette virtual cards knyttet til wallets
   - Bruke mock provider (gratis) eller ekte provider

5. **Staking:**
   - Stake tokens på støttede blockchains

6. **DeFi:**
   - Swaps via DEX aggregators
   - Yield farming
   - Lending/borrowing

---

## 🆘 Troubleshooting

### Problem: "Azure B2C login redirecter ikke tilbake"

**Løsning:**
- Sjekk at redirect URI er riktig i B2C app registration
- Sjekk at redirect URI matcher `NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI` i .env.local
- Sjekk at redirect URI er lagt til i "Authentication" → "Platform configurations"

### Problem: "Cannot read properties of undefined" ved innlogging

**Løsning:**
- Sjekk at alle B2C miljøvariabler er satt
- Sjekk at tenant navn er riktig
- Sjekk browser console for feilmeldinger

### Problem: "Wallet API returns 401 Unauthorized"

**Løsning:**
- Sjekk at bruker er logget inn
- Sjekk at access token er gyldig
- Sjekk at `x-user-id` header er sendt med API requests

### Problem: "Cannot connect to blockchain"

**Løsning:**
- Sjekk at RPC URL er riktig
- Sjekk at RPC endpoint er tilgjengelig
- Prøv en annen RPC provider
- For produksjon, vurder premium providers

---

## 📚 Neste Steg

Når autentisering fungerer:

1. **Test wallet-opprettelse:**
   - Opprett en test wallet via API eller UI
   - Verifiser at den lagres i database

2. **Test transaksjoner:**
   - Send test transaksjoner (på testnet først!)
   - Verifiser at de vises i historikk

3. **Sett opp ekte card provider:**
   - Se `docs/CARD-PROVIDERS.md`
   - Velg mellom Gnosis Pay eller Highnote

4. **Konfigurer monitoring:**
   - Application Insights er allerede satt opp
   - Sett opp alerts for viktige events

---

## 🎉 Ferdig!

Når alt dette er gjort, er wallet-funksjonaliteten klar til bruk! 🚀

Brukere kan nå:
- ✅ Opprette konto og logge inn
- ✅ Opprette wallets på flere blockchains
- ✅ Sende og motta crypto
- ✅ Se saldo og transaksjonshistorikk
- ✅ Bruke virtual cards
- ✅ Stake tokens
- ✅ Bruke DeFi features

---

**Trenger hjelp?** Sjekk `docs/` mappen eller opprett et issue på GitHub.

