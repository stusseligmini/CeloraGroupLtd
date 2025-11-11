# 🚀 Celora Deployment Guide

## 📋 Oversikt

Dette prosjektet bruker **GitHub Actions** for CI/CD og **Azure Bicep** for infrastruktur.

---

## 🔄 **Deployment Flow**

```
┌─────────────────────────────────────────────────────────────┐
│  1. Push til main branch                                     │
│     ↓                                                         │
│  2. GitHub Actions: CI Pipeline kjører                       │
│     - Lint                                                    │
│     - Test (70% coverage required)                           │
│     - Build Next.js + Extension                              │
│     ↓                                                         │
│  3. Auto-deploy til STAGING                                  │
│     ✅ https://celora-web-staging.azurewebsites.net          │
│     ↓                                                         │
│  4. MANUELL GODKJENNING kreves for Production                │
│     (Går til GitHub Actions → Environments → production)     │
│     ↓                                                         │
│  5. Deploy til PRODUCTION                                    │
│     ✅ https://app.celora.com                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 **1. Bicep vs Terraform - Hva er forskjellen?**

### **Terraform** (det du HAR nå):
```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-celora-prod"
  location = "norwayeast"
}
```
- ✅ Fungerer med Azure, AWS, GCP
- ✅ Stort community
- ❌ Krever state management (komplekst!)
- ❌ Ekstra verktøy å installere

### **Bicep** (det du KAN bruke):
```bicep
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-celora-prod'
  location: 'norwayeast'
}
```
- ✅ **Laget av Microsoft for Azure**
- ✅ Enklere syntaks
- ✅ **Ingen state files** - Azure holder styr!
- ✅ Bedre IntelliSense i VS Code
- ✅ Kompilerer til ARM templates
- ❌ Kun Azure (men det er det du bruker)

**Anbefaling:** Bruk **Bicep** siden du KUN skal til Azure! 🎯

---

## 🔧 **2. GitHub Actions Pipelines**

### **Opprettet 3 workflows:**

#### **A) `.github/workflows/ci.yml`** - Build & Test
- ⚡ Kjører på HVER push/PR til main
- ✅ Lint + TypeScript + Tests
- ✅ 70% coverage requirement
- ✅ Security scan med Snyk
- **Deployer IKKE** - bare validering!

#### **B) `.github/workflows/deploy-staging.yml`** - Auto Staging
- ⚡ Kjører AUTOMATISK når du pusher til main
- ✅ Deployer til **staging** Web App
- ✅ https://celora-web-staging.azurewebsites.net
- **INGEN manual approval** nødvendig

#### **C) `.github/workflows/deploy-production.yml`** - Manual Production
- ⚡ **MANUELL trigger** kun!
- ✅ Krever **approval** i GitHub
- ✅ Deployer til **production** Web App
- ✅ https://app.celora.com
- ✅ Lager GitHub Release automatisk

---

## ⚙️ **3. Setup - Steg for steg**

### **Steg 1: GitHub Repository Secrets**

Gå til GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

```yaml
# For STAGING
AZURE_CREDENTIALS_STAGING:
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}

# For PRODUCTION  
AZURE_CREDENTIALS_PROD:
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}

# Optional: For security scanning
SNYK_TOKEN: "xxx"
```

**Hvordan få Azure credentials:**
```bash
az login
az ad sp create-for-rbac --name "celora-github-staging" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

---

### **Steg 2: GitHub Environments (VIKTIG!)**

Dette gir deg **manual approval** for production!

1. Gå til: **Settings → Environments → New environment**
2. Lag **"production"** environment
3. Klikk på **"Required reviewers"**
4. Legg til **deg selv** som reviewer
5. Nå krever production-deploy **din godkjenning**! ✅

---

### **Steg 3: Deploy infrastruktur med Bicep**

```bash
# Login til Azure
az login

# Velg subscription
az account set --subscription "Your Subscription Name"

# Deploy til Azure
cd infra/bicep
az deployment sub create \
  --name celora-prod-deployment \
  --location norwayeast \
  --template-file main.bicep \
  --parameters projectName=celora \
               environment=prod \
               postgresAdminPassword='YourSecurePassword123!'
```

Dette oppretter:
- ✅ 2x Resource Groups (primary + secondary)
- ✅ 2x Web Apps
- ✅ 2x PostgreSQL databases
- ✅ 2x Redis caches
- ✅ 2x Key Vaults
- ✅ Azure Front Door (multi-region load balancer)
- ✅ Application Insights (monitoring)

---

### **Steg 4: Push kode og test!**

```bash
# Commit endringene
git add .
git commit -m "Add GitHub Actions pipelines"
git push origin main
```

**Hva skjer nå:**
1. ⚡ CI pipeline kjører automatisk
2. ✅ Hvis alt grønt → Auto-deploy til STAGING
3. 🎯 Gå til **Actions** tab i GitHub
4. 🚀 For production: Klikk **"Deploy to Production"** → Run workflow → Approve!

---

## 📊 **4. Hva jeg mente med "Oppdatere pipelines"**

Jeg tenkte på disse forbedringene:

### **A) Slack/Teams notifications**
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🚀 Deployed to production!",
        "channel": "#deployments"
      }
```

### **B) Automated database migrations**
```yaml
- name: Run database migrations
  run: npm run db:migrate:deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### **C) Smoke tests etter deploy**
```yaml
- name: Smoke test production
  run: |
    curl --fail https://app.celora.com/api/health || exit 1
```

### **D) Rollback på feil**
```yaml
- name: Rollback on failure
  if: failure()
  run: |
    az webapp deployment slot swap \
      --name ${{ env.AZURE_WEBAPP_NAME }} \
      --slot staging \
      --target-slot production
```

---

## 🎯 **5. Anbefalt Workflow**

```
Developer workflow:
1. Lag feature branch: git checkout -b feature/new-cards
2. Gjør endringer og test lokalt
3. Push feature branch: git push origin feature/new-cards
4. Lag Pull Request til main
5. CI kjører automatisk på PR
6. Merge når alt er grønt ✅
7. Auto-deploy til STAGING
8. Test på staging
9. Manuell trigger for production-deploy
10. Godkjenn i GitHub → Live! 🚀
```

---

## 📁 **Filstruktur**

```
CeloraV2/
├── .github/workflows/
│   ├── ci.yml                    # ✅ Auto: Lint + Test + Build
│   ├── deploy-staging.yml        # ✅ Auto: Deploy til staging
│   └── deploy-production.yml     # 🔒 Manual: Deploy til prod
│
├── infra/
│   ├── bicep/
│   │   ├── main.bicep            # ✅ Hovedfil (multi-region)
│   │   └── modules/
│   │       ├── regionCore.bicep  # Region resources
│   │       ├── frontDoor.bicep   # Azure Front Door
│   │       └── monitoring.bicep  # App Insights
│   │
│   └── terraform/                # ⚠️ Gammel Terraform (kan slettes)
│       └── ...
│
├── azure-devops/                 # ⚠️ Ikke relevant (du bruker GitHub)
│   └── ...
│
└── src/                          # Din app kode
    └── ...
```

---

## 🚨 **Viktige poeng**

### **✅ DO's:**
- ✅ Test alltid på staging først
- ✅ Bruk feature branches
- ✅ Godkjenn production-deploys manuelt
- ✅ Skriv gode commit messages
- ✅ Hold secrets i GitHub Secrets, aldri i kode

### **❌ DON'Ts:**
- ❌ IKKE push direkte til production
- ❌ IKKE commit .env.local
- ❌ IKKE skip tests i pipeline
- ❌ IKKE deploy uten code review
- ❌ IKKE bruk samme credentials for staging og prod

---

## 🆘 **Troubleshooting**

### **Problem: Pipeline feiler på test**
```bash
# Kjør lokalt først:
npm test -- --coverage
# Fix alle feil før du pusher
```

### **Problem: Azure login feiler**
```bash
# Sjekk at credentials er riktige:
az login --service-principal \
  -u $CLIENT_ID \
  -p $CLIENT_SECRET \
  --tenant $TENANT_ID
```

### **Problem: Deployment feiler**
```bash
# Sjekk Azure portal logs:
az webapp log tail --name celora-web-prod --resource-group rg-celora-prod-primary
```

---

## 📞 **Support**

- GitHub Issues: https://github.com/stusseligmini/CeloraGroup/issues
- Pipeline errors: Sjekk **Actions** tab i GitHub
- Azure errors: Sjekk **Azure Portal → Resource → Logs**

---

## 🎉 **Summary**

| Feature | Status |
|---------|--------|
| ✅ GitHub Actions CI/CD | Ferdig |
| ✅ Auto-deploy til Staging | Ferdig |
| ✅ Manual Production deploy | Ferdig |
| ✅ Bicep infrastructure | Ferdig |
| ✅ Multi-region setup | Ferdig |
| ⚠️ Database setup | Trenger Azure credentials |
| ⚠️ Custom domain | Trenger DNS konfigurasjon |

**Neste steg:** Push til GitHub og se magien skje! 🚀

