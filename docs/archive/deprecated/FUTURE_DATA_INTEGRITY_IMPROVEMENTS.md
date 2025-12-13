# Future Data Integrity & Index Improvements

This document captures recommended follow-up enhancements after recent validation and error-handling hardening.

## 1. Soft Delete Strategy

Problem:
Current delete endpoints perform hard deletes on core entities (products, categories, plans, users). This prevents historical reconstruction, complicates audit, and can cause accidental loss.

Recommendation:
Introduce `deleted_at TIMESTAMP NULL` + partial uniqueness scopes that ignore soft-deleted rows.

Implementation Sketch:
- Add `deleted_at` column (nullable) to tables that need retention.
- Update repositories to filter `WHERE deleted_at IS NULL` by default.
- Replace `destroy()` calls with an update setting `deleted_at = NOW()`.
- Create partial unique indexes, e.g.:
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_products_name_cat_active 
    ON kisaan_products (LOWER(name), category_id)
    WHERE deleted_at IS NULL;
- Expose `?include_deleted=true` for administrative retrieval.

Benefits:
- Enables recovery.
- Avoids uniqueness conflicts from logically removed rows.
- Simplifies audit trails.

## 2. Partial Unique Index Refinement for Products

Problem:
We perform application-level duplicate checks for (name, category_id). Relying only on app logic risks race conditions.

Recommendation:
Enforce at the DB level with case-insensitive index constrained to active rows (see above). Keep lightweight pre-check for better UX; treat DB 23505 as fallback.

## 3. Plan Lifecycle State Normalization

Now that `is_active` is restored for plans, consider adding a lightweight status enum only if needed for future draft/published workflows. Until then, `is_active` is sufficient.

## 4. User Duplicate Username Error Normalization

Change already applied: conflict now surfaces as HTTP 409 with structured context `{ code: 'USER_ALREADY_EXISTS', field: 'username' }`. If tests require unified `error.code`, extend error middleware to map `ConflictError` + context.code to `error.code`.

## 5. Commission / Financial Audit Trail

Add append-only `commission_history` table capturing each change (commission_id, old_rate, new_rate, changed_by, changed_at) to improve forensic traceability.

## 6. Transaction Participant Validation

Refinement added ensuring at least one of `farmer_id` or `buyer_id` is present. Consider future enhancement: enforce mutual exclusivity rules if certain transaction types demand both or exactly one actor.

## 7. Central Error Shape Harmonization

Next step: unify legacy `errorName` responses with new `{ error: <ErrorCodes.*>, details: [...] }` structure to reduce parsing branches in tests.

## 8. Idempotency Keys Expansion

Currently applied only in transactions context. Extend optional idempotency to user creation (client-supplied `Idempotency-Key` header) to mitigate double-submit during network retries.

---
Prepared as part of hardening iteration. Prioritize soft delete + partial unique index as first DB migration tranche.
