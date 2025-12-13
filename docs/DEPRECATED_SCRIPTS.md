# Deprecated / Removed Scripts

This document lists legacy scripts and tooling that have been intentionally removed or superseded during the schema normalization, feature gating, and infrastructure consolidation work.

## Goals of the Cleanup
- Eliminate divergent bootstrap / seeding paths
- Remove one-off data fix utilities whose logic is now obsolete after schema normalization
- Prevent accidental re‑execution of ad‑hoc destructive scripts
- Centralize schema + seed lifecycle via `schema:prepare`, `features:seed`, and controlled migrations

## Canonical Replacement Flow
| Purpose | Old Approach (Removed) | Current / Supported Command |
|---------|------------------------|------------------------------|
| Initialize / Apply Full Schema | Multiple ad-hoc SQL & TS scripts | `npm run schema:prepare` (executes `schema/complete-schema.sql` + `schema/indexes.sql`)
| Verify Live DB Structure | Manual inspection / psql | `npm run schema:structure` (runs `scripts/verify-schema-structure.ts`)
| Seed Baseline & Feature Flags | `seed_all.js`, partial inserts | `npm run features:seed` (idempotent)
| Migrate / Normalize Transaction Columns | Manual edits | `npm run migrate:transactions:rename` (idempotent + optional legacy drop)
| Remove Deprecated Script Files | Manual deletion | `npm run cleanup:deprecated` (PowerShell convenience)

## Removed Scripts (Superseded)
| File | Reason | Replacement |
|------|--------|-------------|
| `scripts/check-shop-categories.ts` | Legacy category validation; logic absorbed by normalized schema constraints | None (no longer needed) |
| `scripts/delete_category_safe.js / .ts` | Manual category deletion workflow; risk of orphaning | Managed via standard CRUD & FK constraints |
| `scripts/fix-plan-price.ts` | One-off corrective update; plan pricing logic stabilized | Admin UI / direct controlled migration |
| `scripts/fix-shop-categories.ts` | Data patch no longer relevant after structural changes | Not required |
| `scripts/migrate_all.js` | Catch‑all migration runner causing drift & duplication | Dedicated targeted scripts + `schema:prepare` |
| `scripts/seed_all.js` | Non‑deterministic seed ordering & partial data | `features:seed` (idempotent) |
| `scripts/setup-dev-database.ts` | Divergent bootstrap path | `schema:prepare` + feature seed |

## Partially Deprecated Patterns
| Pattern | Action |
|---------|--------|
| Using inline JSON `Plan.features` blobs for gating | Replaced by normalized feature tables (`kisaan_features`, `kisaan_plan_features`, `kisaan_user_feature_overrides`). Remaining references will be phased out; service now sources from tables. |
| Ad-hoc SQL runbooks for adding columns | Replaced by scripted, idempotent Node migration utilities (e.g. `migrate:transactions:rename`). |

## Active Scripts (Retained)
These are intentionally kept and form the supported maintenance surface:
- `scripts/verify-schema-structure.ts`
- `scripts/migrate-transactions-rename-columns.ts`
- `scripts/seed-features.ts`
- `scripts/remove-deprecated-scripts.ps1`

## Operational Notes
- Always run `npm run schema:structure` after structural migrations to ensure canonical alignment.
- The transaction rename migration can be safely re-run; it checks for column existence before acting. Use `--drop-legacy` ONLY after confirming code/doc references updated.
- Feature seed is additive & idempotent—re-run safely after adding new feature codes.

## Future Cleanup Tasks
- Remove any residual code branches still reading `Plan.features` JSON (search & replace with FeatureService queries).
- Extend automated tests to assert feature gating & retention window enforcement.
- Add continuous integration step invoking: `schema:structure` + lightweight feature availability smoke test.

---
Generated as part of the normalization effort (transaction financial fields + feature gating rollout).