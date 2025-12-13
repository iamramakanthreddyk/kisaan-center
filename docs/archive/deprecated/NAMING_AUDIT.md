# Naming & Consistency Audit (Draft)

Date: 2025-09-24
Scope: Sequelize model layer + key API usage.

## 1. Table Prefix & Naming
| Table | Current | Prefixed? | Consistent? | Notes |
|-------|---------|-----------|-------------|-------|
| kisaan_users | yes | yes | ✔ | Core domain |
| kisaan_shops | yes | yes | ✔ | |
| kisaan_transactions | yes | yes | ✔ | |
| kisaan_transaction_ledger | yes | yes | Partial | Singular vs plural semantics (ledger ok) |
| kisaan_transaction_idempotency | yes | yes | Long | Could shorten to `kisaan_tx_idempotency` |
| kisaan_payments | yes | yes | ✔ | |
| payment_allocations | no | no | ✖ | Add prefix for clarity |
| balance_snapshots | no | no | ✖ | Add prefix or intentionally classify as system tables |
| kisaan_commissions | yes | yes | ✔ | |
| kisaan_settlements | yes | yes | ✔ | |
| kisaan_products | yes | yes | ✔ | |
| kisaan_categories | yes | yes | ✔ | |
| kisaan_plans | yes | yes | ✔ | |
| kisaan_audit_logs | yes | yes | ✔ | |
| kisaan_credits | yes | yes | ✔ | Purpose: credit advances |
| plan_usage (model PlanUsage) | implicit (plan_validation file) | no | ✖ | File naming mismatch; unify to `kisaan_plan_usage` |
| shop_categories (join) | implicit (ShopCategory) | maybe prefixed? | ✖ | Actual table likely `kisaan_shop_categories`? verify migration |
| shop_products (join) | implicit (ShopProducts) | maybe prefixed? | ✖ | Verify actual table name |

Action: Decide whether to prefix all supplemental/system tables for easy schema grouping.

## 2. Timestamp Strategy
| Model | timestamps Option | Fields Present | Inconsistent? | Recommendation |
|-------|-------------------|----------------|---------------|----------------|
| Category | false | created_at (manual) | Yes | Enable timestamps and map |
| Product | false | created_at/updated_at | Yes | Enable timestamps |
| CreditAdvance | false | created_at/updated_at | Yes | Enable or justify as snapshot-only |
| TransactionLedger | false | created_at only | Yes | Add updated_at or keep immutable, but document |
| AuditLog | false | created_at only | Acceptable | Document immutability |
| BalanceSnapshot | true (underscored) | created_at/updated_at | ✔ | Standard |
| Others (User, Shop, Transaction, Payment, etc.) | true | created_at/updated_at | ✔ | |

Policy Proposal:
- Always store both `created_at` and `updated_at` unless the record is immutable (ledger, audit) — explicitly document immutability.
- Uniform: `timestamps: true`, `createdAt: 'created_at'`, `updatedAt: 'updated_at'` across all mutable tables.

## 3. Monetary Precision & Scale
Observed DECIMAL variants: `(5,2)`, `(10,2)`, `(12,2)`, `(15,2)`, `(18,2)`, `(6,4)` (commission_rate).

Classification Proposal:
| Category | Precision | Usage |
|----------|-----------|-------|
| Amount (operational) | DECIMAL(12,2) | transaction line values, payments, balances |
| Large aggregate | DECIMAL(18,2) | cumulative_value, long-term totals |
| Commission rate | DECIMAL(6,4) | fractional percentage with 4 decimals |
| Percentage rate simple | DECIMAL(5,2) | legacy; migrate to (6,4) or integer basis points |
| Allocations high | DECIMAL(15,2) | Evaluate necessity; likely reduce to (12,2) unless real large sums expected |

Action: Inventory maximum expected value ranges; adjust types + add migration plan.

## 4. ENUM Consolidation
Current dispersed ENUMs:
- Roles: superadmin, owner, farmer, buyer
- Status (user/shop/category): active, inactive
- Payment payer_type: BUYER, SHOP; payee_type: SHOP, FARMER; status: PENDING, PAID, FAILED; method: CASH, BANK, UPI, OTHER
- CreditAdvance status: active, repaid, overdue
- Settlement status: pending, settled; reason: overpayment, underpayment, adjustment
- Commission type: percentage, fixed
- Audit action/entity types; plan billing cycles; transaction status (?)

Recommendation: Create `src/domain/enums.ts` exporting frozen objects/types; replace inline DataTypes.ENUM with string columns + validation OR maintain ENUMs via migrations centrally.

Pros of raw string + validation: easier to extend without DB migration (except when new constraints needed). Cons: loses DB-level constraint.

Decision Option: Hybrid — keep ENUM in DB for critical invariants (roles, payment status) and use validated VARCHAR for frequently evolving domains.

## 5. Redundant / Derived Fields
| Entity | Fields | Issue | Recommendation |
|--------|--------|-------|----------------|
| Transaction | total_sale_value vs total_amount | Duplication | Keep one canonical (total_amount), alias in code |
| Transaction | shop_commission & commission_amount | Duplication | Keep commission_amount; compute shop_commission if semantic identical |
| Transaction | farmer_earning | Derived (total - commission) | Keep as denormalized for performance but enforce invariant in trigger/service |
| Transaction | commission_rate, commission_type vs Commission table | Duplication | Treat as snapshot columns (immutable after create) |
| Product | status vs record_status | Overlapping state | Consolidate to one field + maybe `archived_at` timestamp |

## 6. Foreign Key Coverage Gaps (Now Wired)
Previously missing associations have been added. Remaining considerations:
- Enforce NOT NULL on product_id in transactions (after data backfill).
- Add ON DELETE RESTRICT/SET NULL strategy documentation.

## 7. Index & Query Observations
| Table | Current Index Patterns | Potential Additions |
|-------|------------------------|---------------------|
| kisaan_transactions | shop_id, farmer_id, buyer_id, category_id, created_at, product_id | Composite (shop_id, created_at DESC), (farmer_id, created_at), (buyer_id, created_at) for range queries; maybe (buyer_id, farmer_id) for cross filter |
| kisaan_payments | transaction_id, payer_type, payee_type, status, payment_date, counterparty_id, (transaction_id,status) | Add (status, payment_date) for dashboard counts |
| kisaan_transaction_idempotency | key unique, buyer_id, farmer_id, shop_id, transaction_id | Add partial index on (transaction_id) WHERE transaction_id IS NULL for cleanup scans |
| balance_snapshots | (implicit) | Add (user_id, created_at DESC) |
| payment_allocations | none listed | Add (transaction_id), (payment_id) |
| kisaan_credits | none explicit | Add (user_id, status) |

## 8. Proposed Migration Set (Not Executed Yet)
| Migration | Change |
|-----------|--------|
| 001_unify_decimal_precision | Alter DECIMAL columns to standard tiers |
| 002_enable_timestamps_category_product_credit | Set timestamps true & add updated_at where missing |
| 003_transaction_field_normalization | Remove total_sale_value OR total_amount; rename commission_amount; add computed view if needed |
| 004_enforce_transaction_product_fk | Backfill product_id then set NOT NULL |
| 005_index_enhancements_round1 | Add composite + missing junction indexes |
| 006_enum_refactor_phase1 | Convert selected ENUMs to VARCHAR + validation (if chosen) |

## 9. Validation & DTO Layer Gaps
- No central validation for settlements, credits, commissions (add Zod schemas analogous to transaction/payment).
- Need invariants: farmer_earning + shop_commission == total_amount, commission_rate bounds (0–100%).

## 10. Recommended Policy Document
Create `docs/SCHEMA_CONVENTIONS.md` capturing final agreed standards (after approval of this audit draft).

## 11. Open Questions for Confirmation
1. Keep DB ENUMs or move to string + code validation for flexible domains? (default suggestion: keep ENUM for roles & payment status only)
2. Accept performance trade-off to drop derived duplicates (prefer derivation) or keep for query simplicity? (recommend keep farmer_earning only if heavily queried)
3. Adopt prefix for all tables? (recommend yes for consistency: migrate `payment_allocations`, `balance_snapshots` => `kisaan_payment_allocations`, `kisaan_balance_snapshots`)

## 12. Next Steps
After confirmation:
1. Generate remediation recommendation matrix (impact vs effort).
2. Plan phased migrations (safe order, backward compatibility notes).
3. Begin DTO/entity gap fill.

> Provide feedback or say "approve naming audit" to proceed.
