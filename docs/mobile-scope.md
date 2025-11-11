# Celora Mobile PWA & Extension Scope

## Supported Surfaces

- **Mobile PWA (`/`)**
  - Redirect-based MSAL login with offline-ready shell.
  - Wallet snapshot (balance, holdings, last activity) fetched from Azure PostgreSQL via platform API.
  - Security notification feed with acknowledgement actions propagated to Azure Redis-backed queue.
  - Lightweight profile drawer for local-only preferences.

- **Chromium Extension Popup**
  - Shares the same `AuthProvider` (MSAL popup flow) and data hooks as the PWA.
  - Condensed layout for quick balance + alert checks.
  - Shortcut actions: open full PWA, manage account, refresh data.

## Out-of-Scope / Removed

- Legacy admin consoles, analytics dashboards, Solana ingestion UIs.
- Supabase/Vercel integration points (auth hooks, API proxies, hosting configs).
- Redundant shell routes (`/fresh`, deprecated layout scaffolds).

## Design Principles

1. **Single Source of Truth:** All authenticated data comes from Azure platform APIs secured by Azure AD B2C scopes.
2. **Shared Components:** `AuthProvider`, data hooks, and UI shell components are reused between PWA and extension.
3. **Mobile-first:** Layouts prioritise touch targets, safe-area padding, and low-latency hydration.
4. **Offline Awareness:** PWA retains `/offline` fallback; extension gracefully handles background refresh failures.

## Next Steps

- Hook in push notification registration once Azure Notification Hubs configuration is finalised.
- Extend wallet detail view with transaction filters after PostgreSQL endpoints stabilise.
- Add extension options page for selecting notification severities (reuses existing hooks).