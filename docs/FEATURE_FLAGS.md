# Feature Flags & Access Control

This document explains the layered feature gating system now in the backend.

## Layers & Precedence

1. Default Feature Definitions (`kisaan_features`)
2. Plan Feature Mappings (`kisaan_plan_features`) override defaults for shops on that plan
3. User Overrides (`kisaan_user_feature_overrides`) override both plan + defaults for a specific user

Final effective value = user override (if present) else plan mapping (if present) else default.

## Current Feature Codes

| Code | Category | Default | Purpose |
|------|----------|---------|---------|
| transactions.list | transactions | true | Access paginated transaction list endpoints |
| transactions.analytics | transactions | true | Access aggregated analytics endpoint |
| transactions.history.full | transactions | false | Access historical data beyond retention window |
| data.retention.unlimited | data | false | Alias style flag allowing unlimited data retention |
| reports.generate | reports | true | Generate reports (JSON / PDF / Excel in memory) |
| reports.download | reports | false | Download generated report files |

## Retention Logic

Default retention window: 7 days.
If either `transactions.history.full` or `data.retention.unlimited` is enabled, retention expands to effectively unlimited (10 years constant used).
Middleware `enforceRetention(fromParam, toParam)` clamps query params to allowed window.

## Middleware

`loadFeatures` – attaches `req.features` with structure `{ features: Record<string, boolean>, retentionDays: number }`.
`requireFeature(code)` – rejects 403 if feature disabled.
`enforceRetention(fromParam, toParam)` – normalizes a date range within allowed retention.

Applied To:
* `/transactions` (list) – requires `transactions.list` + retention clamp
* `/transactions/analytics` – requires `transactions.analytics` + retention clamp
* `/transactions/farmer/:id/list` & `/transactions/buyer/:id/list` – same as list
* `/reports/generate` – requires `reports.generate` (+ retention if date params used upstream)
* `/reports/download` – requires `reports.download`

## Admin Overrides

Routes under `/api/features-admin` (superadmin only):
* GET `/users/:userId` – show effective feature map + sources
* POST `/users/:userId/override` body: `{ feature_code, enabled }`
* DELETE `/users/:userId/override/:feature_code`

## Adding a New Feature

1. Insert (or upsert) a row in `kisaan_features` (or add to `seed-features.ts` and run `npm run features:seed`).
2. (Optional) Map it to plans via `kisaan_plan_features`.
3. Use `requireFeature('your.code')` on desired routes.
4. Document it here.

## Operational Notes

Caching: feature map cached per-user in-memory for 30s. Purge by restarting process if urgent.
DB Safety: All seed scripts are idempotent (using `upsert`).
Future Migration: Plan legacy JSON field will be deprecated in favor of normalized tables exclusively.
