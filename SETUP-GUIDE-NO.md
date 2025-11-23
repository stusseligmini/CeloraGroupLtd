# 🚀 Celora V2 - Komplett Oppsettsguide

## 📋 Oversikt

Denne guiden tar deg gjennom hele oppsettet av Celora V2 fra start til produksjon. Vi går gjennom:

1. ✅ Lokalt utviklingsmiljø
2. ✅ Database oppsett
3. ✅ Miljøvariabler
4. ✅ Azure infrastruktur
5. ✅ GitHub Actions konfigurasjon
6. ✅ Første deployment

---

## 🎯 Steg 1: Lokalt Utviklingsmiljø

### Forutsetninger

- **Node.js 20+** - [Last ned her](https://nodejs.org/)
- **PostgreSQL** - Lokalt eller Azure Database
- **Git** - For versjonskontroll
- **Azure CLI** - For infrastruktur (valgfritt nå)

### Installasjon

```bash
# 1. Klon repository (hvis du ikke allerede har det)
git clone <ditt-repo-url>
cd CeloraV2

# 2. Installer dependencies
npm install

# 3. Generer Prisma client
npm run db:generate
```

---

## 🗄️ Steg 2: Database Oppsett

### Alternativ A: Lokal PostgreSQL

```bash
# Windows (med Chocolatey)
choco install postgresql

# Eller last ned fra: https://www.postgresql.org/download/windows/

# Start PostgreSQL service
net start postgresql-x64-14

# Opprett database
psql -U postgres
CREATE DATABASE celora;
\q
```

### Alternativ B: Docker (Enklest!)

```bash
# Kjør PostgreSQL i Docker
docker run --name celora-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=celora \
  -p 5432:5432 \
  -d postgres:15

# Database er nå tilgjengelig på localhost:5432
```

### Alternativ C: Azure Database (Produksjon)

Vi setter opp Azure Database senere i guiden.

### Oppdater Database Schema

```bash
# Push database schema til databasen
npm run db:push

# (Valgfritt) Seed med testdata
npm run db:seed
```

---

## 🔐 Steg 3: Miljøvariabler

### Opprett `.env.local` fil

```bash
# Kopier template
cp ENV_TEMPLATE.md .env.local
```

### Minimum Konfigurasjon (for å komme i gang)

Rediger `.env.local` og legg til minimum:

```env
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/celora
DIRECT_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/celora

# Encryption keys (generer nye!)
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_SALT=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

# Node environment
NODE_ENV=development

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Card Provider (bruk mock for utvikling - GRATIS!)
CARD_PROVIDER=mock

# Telegram Bot (valgfritt - kan settes opp senere)
TELEGRAM_BOT_ENABLED=false
```

### Generer Sikkerhetsnøkler

```bash
# Generer encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generer salt (16 bytes = 32 hex chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generer webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ VIKTIG:** Kopier output fra kommandoene over og legg dem i `.env.local`

---

## 🧪 Steg 4: Test Lokalt

```bash
# Start utviklingsserver
npm run dev
```

Åpne nettleseren: **http://localhost:3000**

Du skal nå se Celora applikasjonen! 🎉

### Test at alt fungerer

1. ✅ Sjekk at siden laster
2. ✅ Prøv å opprette en bruker (hvis auth er satt opp)
3. ✅ Sjekk at database fungerer (se i Prisma Studio: `npm run db:studio`)

---

## ☁️ Steg 5: Azure Infrastruktur Setup

### Forutsetninger

- **Azure Account** - [Opprett gratis her](https://azure.microsoft.com/free/)
- **Azure CLI** installert - [Installer her](https://docs.microsoft.com/cli/azure/install-azure-cli)

### Login til Azure

```bash
# Login
az login

# Velg subscription
az account list --output table
az account set --subscription "Din Subscription Navn"
```

### Deploy Infrastruktur med Bicep

```bash
# Gå til Bicep mappen
cd infra/bicep

# Deploy til Azure
az deployment sub create \
  --name celora-prod-deployment \
  --location norwayeast \
  --template-file main.bicep \
  --parameters projectName=celora \
               environment=prod \
               postgresAdminPassword='DittSikrePassord123!'

# Vent på at deployment er ferdig (tar 10-15 minutter)
```

Dette oppretter:
- ✅ Resource Groups (primary + secondary)
- ✅ Web Apps (staging + production)
- ✅ PostgreSQL databases
- ✅ Redis caches
- ✅ Key Vaults
- ✅ Application Insights
- ✅ Azure Front Door

### Hent Azure Credentials for GitHub Actions

```bash
# For STAGING
az ad sp create-for-rbac \
  --name "celora-github-staging" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth

# For PRODUCTION
az ad sp create-for-rbac \
  --name "celora-github-prod" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

**Kopier output JSON** - du trenger den i neste steg!

---

## 🔧 Steg 6: GitHub Actions Konfigurasjon

### Opprett GitHub Secrets

Gå til ditt GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Klikk **New repository secret**

Legg til disse secrets:

#### For Staging:
```
Name: AZURE_CREDENTIALS
Value: {JSON fra az ad sp create-for-rbac for staging}
```

```
Name: AZURE_STAGING_WEBAPP_NAME
Value: celora-web-staging
```

```
Name: AZURE_STAGING_RESOURCE_GROUP
Value: rg-celora-staging-primary
```

#### For Production:
```
Name: AZURE_CREDENTIALS_PROD
Value: {JSON fra az ad sp create-for-rbac for production}
```

#### Valgfritt (for security scanning):
```
Name: SNYK_TOKEN
Value: {din-snyk-token}
```

### Opprett GitHub Environment

For å få **manual approval** på production deploys:

1. Gå til **Settings** → **Environments**
2. Klikk **New environment**
3. Navn: `production`
4. Klikk **Required reviewers**
5. Legg til deg selv som reviewer
6. Klikk **Save**

Nå krever production-deploy **din godkjenning**! ✅

---

## 🚀 Steg 7: Første Deployment

### Push kode til GitHub

```bash
# Sjekk at alt er commitet
git status

# Commit endringer
git add .
git commit -m "Initial setup: Ready for deployment"

# Push til main branch
git push origin main
```

### Hva skjer nå?

1. ⚡ **CI Pipeline kjører automatisk**
   - Lint + TypeScript check
   - Tests (må ha 70% coverage)
   - Build Next.js app
   - Security scan

2. ✅ **Hvis alt er grønt** → Auto-deploy til **STAGING**
   - Gå til **Actions** tab i GitHub
   - Se at "Deploy to Staging" kjører
   - Vent på at det er ferdig

3. 🎯 **Test på Staging**
   - URL: `https://celora-web-staging.azurewebsites.net`
   - Test at alt fungerer

4. 🚀 **Deploy til Production** (når du er klar)
   - Gå til **Actions** → **Deploy to Production**
   - Klikk **Run workflow**
   - Velg version (eller bruk "latest")
   - Klikk **Run workflow**
   - **Godkjenn** når du får spørsmål
   - Vent på at deployment er ferdig

---

## 📊 Steg 8: Konfigurer Azure Web App Settings

### Legg til Environment Variables i Azure

```bash
# For STAGING
az webapp config appsettings set \
  --name celora-web-staging \
  --resource-group rg-celora-staging-primary \
  --settings \
    DATABASE_URL="postgresql://..." \
    ENCRYPTION_KEY="..." \
    NODE_ENV="production" \
    CARD_PROVIDER="mock"

# For PRODUCTION
az webapp config appsettings set \
  --name celora-web-prod \
  --resource-group rg-celora-prod-primary \
  --settings \
    DATABASE_URL="postgresql://..." \
    ENCRYPTION_KEY="..." \
    NODE_ENV="production" \
    CARD_PROVIDER="mock"
```

**⚠️ VIKTIG:** Bruk Azure Key Vault for sensitive secrets i produksjon!

### Alternativ: Bruk Azure Portal

1. Gå til Azure Portal
2. Finn din Web App
3. **Settings** → **Configuration** → **Application settings**
4. Legg til alle miljøvariabler fra `.env.local`
5. Klikk **Save**

---

## 🗄️ Steg 9: Database Migrations i Produksjon

### Kjør migrations på Azure

```bash
# For STAGING
az webapp ssh \
  --name celora-web-staging \
  --resource-group rg-celora-staging-primary

# Inne i SSH:
npm run db:migrate:deploy

# For PRODUCTION
az webapp ssh \
  --name celora-web-prod \
  --resource-group rg-celora-prod-primary

# Inne i SSH:
npm run db:migrate:deploy
```

### Eller: Legg til i GitHub Actions

Workflows har allerede støtte for dette, men du kan forbedre det:

Se `DEPLOYMENT_GUIDE.md` for eksempler på automatiske migrations.

---

## ✅ Steg 10: Verifiser Alt Fungerer

### Sjekkliste

- [ ] Lokal utvikling fungerer (`npm run dev`)
- [ ] Database er opprettet og migrert
- [ ] GitHub Actions workflows kjører uten feil
- [ ] Staging deployment er live
- [ ] Production deployment er live (når klar)
- [ ] Health check endpoint svarer: `/api/diagnostics/health`
- [ ] Appen laster i nettleseren

### Test Endpoints

```bash
# Health check
curl https://celora-web-staging.azurewebsites.net/api/diagnostics/health

# Skal returnere: {"status":"ok"}
```

---

## 🎯 Neste Steg

### Utvikling

1. **Start koding!** 🎨
   ```bash
   npm run dev
   ```

2. **Test lokalt først**
   - Gjør endringer
   - Test at de fungerer
   - Commit og push

3. **Automatisk deploy til staging**
   - Push til main → Auto-deploy til staging
   - Test på staging
   - Når klar → Deploy til production

### Produksjon

1. **Sett opp ekte card provider**
   - Se `docs/CARD-PROVIDERS.md`
   - Velg mellom Gnosis Pay eller Highnote

2. **Konfigurer custom domain**
   - Legg til DNS records
   - Konfigurer SSL i Azure

3. **Sett opp monitoring**
   - Application Insights er allerede konfigurert
   - Sett opp alerts

4. **Sett opp backup**
   - Database backups er automatisk i Azure
   - Verifiser at de kjører

---

## 🆘 Troubleshooting

### Problem: Database connection feiler

```bash
# Sjekk at PostgreSQL kjører
# Windows:
net start postgresql-x64-14

# Docker:
docker ps | grep postgres

# Test connection
psql -U postgres -d celora -h localhost
```

### Problem: GitHub Actions feiler

1. Sjekk **Actions** tab i GitHub
2. Se hvilken step som feiler
3. Sjekk logs for detaljer
4. Vanlige problemer:
   - Missing secrets → Legg til i GitHub Secrets
   - Test failures → Fix tests lokalt først
   - Build errors → Test `npm run build` lokalt

### Problem: Azure deployment feiler

```bash
# Sjekk logs
az webapp log tail \
  --name celora-web-staging \
  --resource-group rg-celora-staging-primary

# Sjekk deployment status
az webapp deployment list \
  --name celora-web-staging \
  --resource-group rg-celora-staging-primary
```

### Problem: Appen laster ikke

1. Sjekk at Web App er running i Azure Portal
2. Sjekk Application Insights for errors
3. Sjekk at environment variables er satt riktig
4. Sjekk database connection

---

## 📚 Ytterligere Ressurser

- **[QUICKSTART.md](QUICKSTART.md)** - Rask oppstart (5 minutter)
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Detaljert deployment guide
- **[docs/developer/architecture.md](docs/developer/architecture.md)** - Systemarkitektur
- **[ENV_TEMPLATE.md](ENV_TEMPLATE.md)** - Alle miljøvariabler forklart

---

## 🎉 Gratulerer!

Du har nå satt opp hele Celora V2 systemet! 🚀

**Hva du har:**
- ✅ Lokalt utviklingsmiljø
- ✅ Database oppsett
- ✅ Azure infrastruktur
- ✅ CI/CD pipelines
- ✅ Staging og Production miljøer

**Neste steg:** Start å bygge features! 🎨

---

*Trenger hjelp? Sjekk dokumentasjonen i `docs/` mappen eller opprett et issue på GitHub.*

