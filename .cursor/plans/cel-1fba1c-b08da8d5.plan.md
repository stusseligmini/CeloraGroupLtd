<!-- b08da8d5-85ce-4e5a-8729-7dfa09eb7cb9 98222be6-9bb1-4ac8-90df-3c54ad1fd2b4 -->
# Celora – TODO-plan tilpasset prosjektstrukturen

## Mål

Produksjonsklar PWA + MV3-extension med sikker auth, stabile API-er, full observability og robuste CI/CD-pipelines (Azure DevOps), i tråd med angitt mappestruktur.

## Omfang

- Kjerne: DB/ORM, kontrakter/validering, auth/sikkerhet, observability, testing
- PWA & Extension: SW/Workbox, push, MV3-hardening, artefakter
- Leveranse: CI/CD, infra-hardening, dokumentasjon/DX

## Leveransebølger

- Sprint 1: DB/ORM, Zod/OpenAPI, MSAL-hardening, CSP/rate-limit, App Insights, Unit/Integration, Workbox+Manifest, MV3-hardening, pipeline-gates
- Sprint 2: Dashboards/alerts, E2E (PWA/Extension), BFF-retries/idempotency, multi-env CD/Key Vault, infra-hardening, DX/ADR

## Fil- og mappeforankring

- DB: `src/server/db/` (migrasjoner, seed)
- API: `src/app/api/*/route.ts` (Zod, typed handlers)
- Auth: `src/providers/AuthProvider.tsx`, `src/lib/api/msalClient.ts`
- Sikkerhet: `src/lib/security/contentSecurityPolicy.ts`, `src/lib/security/csrfProtection.ts`, `src/middleware.ts`
- BFF/Services: `src/server/services/platformClient.ts`, `src/server/services/*`
- Cache: `src/server/cache/redisCache.ts`
- PWA: `public/manifest.json`, `public/sw.js`, `src/components/ServiceWorkerRegistration.tsx`
- Extension: `extension/manifest.json`, `extension/src/popup.tsx`, `scripts/build-extension.mjs`
- CI/CD: `azure-devops/pipelines/app-ci-cd.yml`, `azure-devops/pipelines/infra-terraform.yml`
- Infra: `infra/bicep/*`, `infra/terraform/*`
- Docs: `docs/*` (OpenAPI, ADR, baselines)

## CI/CD-pipelinekrav (Azure DevOps)

1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build` (PWA)
5. `npm run build:extension`
6. Pakk artefakter: `celora-pwa.tgz`, `celora-extension.zip`

### To-dos

- [ ] Velg ORM (Prisma eller Drizzle) og migrasjonsstrategi
- [ ] Velg push-kanal (Azure Notification Hubs vs Web Push VAPID)
- [ ] Fastsett miljøer (dev/stage/prod) og Key Vault-referanser i App Service
- [ ] Etabler src/server/db/ klient, migrasjoner, seed, PgBouncer
- [ ] Definer datamodell og migrasjoner for Wallet/Notifications
- [ ] Lag seed-skript med realistiske dev-data
- [ ] Innfør Zod i alle src/app/api/* og typed route handlers
- [ ] Generer OpenAPI (zod-to-openapi) og publiser som artefakt
- [ ] MSAL silent refresh, token-rotation, feil/retry-policy
- [ ] HttpOnly/Secure cookies, nonce-cookie, CSRF for mutasjoner
- [ ] src/middleware.ts beskytter non-public routes og B2C-session
- [ ] Stram contentSecurityPolicy.ts (nonce, connect-src, img-src)
- [ ] Rate limiting middleware + 429-responsformat
- [ ] App Insights: logger, traces, distributed tracing (server+client)
- [ ] Vitest for hooks/lib og MSW-integrasjonstester for API
- [ ] Service worker via Workbox: precache, runtime cache, bg sync
- [ ] Integrer valgt push-kanal og public/sw-notifications.js
- [ ] Oppdater manifest (iOS meta, maskable) + offline-fallback
- [ ] Hardne manifest.json (permissions), robust MV3 SW og messaging
- [ ] Byggversjon (semver), changelog, ZIP-artifact for butikk
- [ ] BFF i platformClient.ts med auth-injeksjon, retries, timeouts
- [ ] Konsistent feilformat + idempotency keys for POST
- [ ] CI-gates: lint, typecheck, test; bygg-cache; publiser artefakter
- [ ] CD-steg per miljø med Key Vault-integrasjon og approvals
- [ ] Front Door WAF/certs, App Service autoscale/slots, PG PITR/alerts
- [ ] Dashboards for feilrate, p95, auth-feil; varsler på 5xx/latency
- [ ] Playwright E2E for PWA (auth-stub, offline-case, kritiske flyter)
- [ ] Playwright E2E for Extension (MV3 profil, popup/content sanity)
- [ ] ESLint strict, Prettier, Husky/Commitlint, .env.example, ADRs