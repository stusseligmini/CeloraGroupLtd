# Azure-Only Baseline

Documenting the removal of Supabase/Vercel artefacts and the current Azure-first foundation for the Celora mobile PWA and companion browser extension.

## 1. Migration Summary

| Checklist Item | Status | Notes |
| -------------- | ------ | ----- |
| Supabase SDKs, hooks, and env vars removed | ✅ | `grep -Ri "supabase" ./` returns only historical comments. No Supabase packages in `package.json`. |
| Vercel/DigitalOcean configs removed | ✅ | README rewritten for Azure; no `.vercel`, DO manifests, or Vercel host mentions in `next.config.js`. |
| Azure AD B2C AuthProvider in place | ✅ | `src/providers/AuthProvider.tsx` drives MSAL for both PWA and extension. |
| Azure env template aligned | ✅ | `ENV_TEMPLATE.md` covers B2C, Key Vault, Redis, Storage, OTEL, and API endpoints. |
| Azure DevOps pipelines updated | ✅ | `azure-devops/pipelines/app-ci-cd.yml` runs PWA + extension builds only; no GitHub/Vercel jobs. |

## 2. Platform Baseline

- **Identity:** Azure AD B2C SPA client (redirect login for PWA, popup login for extension) + confidential client for server-to-server calls.
- **APIs:** Next.js route handlers proxy to the Azure platform API (`PLATFORM_API_BASE_URL`) and apply consistent CORS.
- **Data Sources:** Wallet summaries originate from Azure Database for PostgreSQL; notification feed backed by Azure Cache for Redis and surfaced via platform API.
- **Secrets:** Azure Key Vault hosts encryption secrets and downstream API credentials (referenced via `AZURE_KEY_VAULT_URL`).
- **Observability:** Application Insights and OTEL collector endpoints configured through environment template.

## 3. Verification Steps

1. **Dependency Audit**
   - `npm ls supabase` → should report `empty`.
   - `rg -i "supabase"` → only historical note in `src/hooks/useAuthFlow.ts`.
   - `rg -i "vercel"` → expect only Azure migration commentary or removed entirely.

2. **Environment Validation**
   - Copy `ENV_TEMPLATE.md` → `.env.local` and populate Azure credentials.
   - Visit `/api/diagnostics/env` (requires `npm run dev`) to confirm required variables resolve.

3. **Runtime Checks**
   - `npm run dev` → Sign in with Azure B2C, confirm dashboard renders wallet + notifications.
   - `npm run build:extension` → Load `extension/` unpacked in Chrome, authenticate via popup, confirm data parity with PWA.

4. **CI Pipeline**
   - `npm run lint && npm run test && npm run build && npm run build:extension`.
   - Azure DevOps pipeline publishes `celora-pwa.tgz` + `celora-extension.zip` artifacts only.

## 4. Operational Notes

- All new features must extend the Azure-authenticated scope: authentication, wallet snapshot, notifications, and lightweight preferences.
- Non-core pages (legacy admin consoles, analytics shells, Solana ingestion UIs) were removed from the repo; use feature flags and lazy routes for future expansions.
- Redis connection failures automatically fall back to in-memory caching in development; production must configure `AZURE_REDIS_CONNECTION_STRING`.

Maintain this document as the single source of truth when auditing future migrations or onboarding new environments. Any deviation from the Azure-only baseline should be documented here with a remediation plan.

