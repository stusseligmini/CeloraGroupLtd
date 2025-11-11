# Celora – Azure Surface

> Mobile-first account hub and companion extension powered entirely by the Azure stack. Supabase, Vercel, and DigitalOcean artefacts have been fully retired.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![Azure](https://img.shields.io/badge/Platform-Azure_Active_Directory_%7C_PostgreSQL_%7C_Redis-blue)](https://azure.microsoft.com/)
[![CI](https://img.shields.io/badge/CI-Azure_DevOps-purplish)](azure-devops/pipelines/app-ci-cd.yml)

## Overview

- **Clients:** Responsive mobile PWA (`/`) and Chromium extension popup sharing the same MSAL-based `AuthProvider`.
- **Identity:** Azure AD B2C (SPA + confidential clients) with single access token powering both clients.
- **Data plane:** Azure PostgreSQL wallet service, Azure Cache for Redis edge caching, and secrets managed in Azure Key Vault.
- **Hosting:** Static assets delivered via Azure Front Door + Storage; API routes run on Azure App Service/Functions.
- **Observability:** App Insights + OTEL exporter hooks baked into the runtime (see `ENV_TEMPLATE.md`).

See `docs/azure-baseline.md` for the migration audit and verification checklist.

## Core Feature Scope

- **Authentication** – Sign-in/up/reset flows via Azure AD B2C (MSAL redirect on web, popup in the extension).
- **Wallet Snapshot** – Cached account balance, active holdings, and transaction pulse sourced from the Azure PostgreSQL API.
- **Security Notifications** – Recent account alerts with acknowledgement support backed by Azure Redis + service API.
- **Profile Basics** – Lightweight local settings (theme/language) with persisted claim metadata from B2C.

Out-of-scope admin surfaces, analytics consoles, and legacy Supabase/Vercel shells have been removed from the codebase.

## Architecture on Azure

| Layer              | Azure Service(s)                                           | Notes                                                   |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| Identity           | Azure AD B2C                                               | SPA client (`NEXT_PUBLIC_*`) + confidential client for APIs |
| API Gateway        | Azure App Service / Functions (Next.js route handlers)     | Proxies to platform API + enforces CORS                 |
| Data               | Azure Database for PostgreSQL + Azure Cache for Redis      | Wallet snapshot + notification feeds                    |
| Secrets            | Azure Key Vault                                            | Encryption keys + downstream API credentials           |
| Static Delivery    | Azure Storage + Front Door                                 | Mobile PWA + extension assets                           |
| Observability      | Azure Application Insights + OTEL collector                | Hooked through environment template                     |

## Getting Started

```bash
npm install
cp ENV_TEMPLATE.md .env.local   # populate with Azure credentials
npm run dev                     # launches Next.js on http://localhost:3000
```

### Browser Extension (Chromium)

```bash
# Build the popup bundle (uses esbuild + shared React components)
npm run build:extension

# Load the unpacked directory in Chrome:
# chrome://extensions → Enable Developer Mode → Load unpacked → select ./extension
```

Extension configuration inherits environment details from `.env.local`. Defaults ship with localhost endpoints; update `extension/popup.html` data attributes for production origins.

## Environment Essentials

Key variables (all documented in `ENV_TEMPLATE.md`):

- `NEXT_PUBLIC_AZURE_B2C_*` – SPA client + policy identifiers.
- `AZURE_B2C_CLIENT_ID`, `AZURE_B2C_CLIENT_SECRET`, `AZURE_B2C_TENANT_ID` – confidential client for server-side API fan-out.
- `PLATFORM_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` – Azure platform API (wallet + notifications).
- `NEXT_PUBLIC_EXTENSION_ORIGIN` – Chrome extension origin for CORS (e.g. `chrome-extension://<extension-id>`).
- `AZURE_KEY_VAULT_URL`, `AZURE_REDIS_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT` – supporting platform services.
- `APPLICATION_INSIGHTS_CONNECTION_STRING` – telemetry pipeline.

## Quality Gates

Run locally (also enforced in Azure DevOps pipeline):

```bash
npm run lint
npm run test
npm run build
npm run build:extension
```

The CI pipeline (`azure-devops/pipelines/app-ci-cd.yml`) restores dependencies with `npm ci`, executes the commands above, packages the PWA artifact (`celora-pwa.tgz`), and produces the signed extension archive (`celora-extension.zip`).

## Documentation Map

- `docs/azure-baseline.md` – Supabase removal audit + Azure configuration baseline.
- `docs/mobile-scope.md` – Detailed scope for the mobile PWA and browser extension footprint.
- `ENV_TEMPLATE.md` – Complete environment variable reference with Azure-specific guidance.

## Support & Next Steps

- Update Azure Front Door routes to point the extension popup to `/extension` once deployed.
- Ensure Redis and PostgreSQL firewall rules allow the App Service identity.
- Coordinate release tagging through Azure DevOps environments for production sign-off.

Questions? Reach out to the Celora platform team (`platform@celora.azure`). All future work must extend the Azure-only footprint captured here.
