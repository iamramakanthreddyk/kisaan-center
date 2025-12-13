# API ↔ Table Mapping (Draft)

Legend:
- R = Read (SELECT)
- W = Write/Mutate (INSERT/UPDATE/DELETE)
- D = Derived / Side-effect (ledger, snapshots, idempotency, audit)
- T = Transactional boundary should encompass all touched rows

> Scope: Initial pass focused on Transactions, Payments, Settlements, Balances, Credits, Commissions, Users, Products.

## Core Financial & Transaction Domain
| Endpoint | Primary Tables (W) | Secondary Tables (R) | Derived (D) | Transaction Boundary | Notes / Risks |
|----------|--------------------|----------------------|-------------|----------------------|---------------|
| POST /transactions/ | kisaan_transactions (W) | kisaan_users (R/W balances), kisaan_products (R), kisaan_commissions (R) | kisaan_transaction_ledger (D W), kisaan_transaction_idempotency (W), balance_snapshots (D W) | Yes (wrap all) | Atomic create implemented; ensure SELECT FOR UPDATE on users (future) |
| POST /transactions/quick | kisaan_transactions (W) | kisaan_users (R/W), kisaan_products (R optional), kisaan_commissions (R) | ledger, idempotency?, snapshots | Yes | Quick path delegates to service; product_name fallback risk |
| PUT /transactions/:id | kisaan_transactions (W) | (same row pre-read) | (none) | Should | Currently inline raw SQL w/out ledger recompute; missing audit |
| DELETE /transactions/:id | kisaan_transactions (W delete) | - | ledger? audit? | Should | Hard delete; consider soft delete + cascading cleanup |
| GET /transactions/ (list) | - | kisaan_transactions (R) | - | No | Filtering requires at least one context id; ok |
| GET /transactions/:id | - | kisaan_transactions (R), kisaan_payments (R), kisaan_users (R) | - | No | Could include related preloads post-association |
| GET /transactions/analytics | - | kisaan_transactions (R aggregate), kisaan_payments (R aggregate) | - | No | Multi-query aggregate; risk of point-in-time drift |
| POST /transactions/payments | kisaan_payments (W) | kisaan_transactions (R), kisaan_users (R/W balances) | ledger, balance_snapshots | Yes | Must ensure payment + balance + ledger atomic |
| PUT /transactions/payments/:id/status | kisaan_payments (W) | kisaan_transactions (R) | ledger? snapshots? | Yes | Status transitions need invariant checks |
| GET /transactions/payments/outstanding | - | kisaan_transactions, kisaan_payments | - | No | Derived outstanding calculation |
| GET /transactions/*/payments (buyer/farmer) | - | kisaan_payments (R), kisaan_transactions (R) | - | No | Pagination absent |
| GET /transactions/shop/:shopId/earnings | - | kisaan_transactions (R aggregate) | - | No | Add caching later |
| POST /payments/ | kisaan_payments (W) | kisaan_transactions (R), kisaan_users (R/W) | ledger, balance_snapshots | Yes | Duplicate path vs /transactions/payments |
| POST /payments/bulk | kisaan_payments (W multi) | kisaan_transactions (R), kisaan_users (R/W) | ledger (multi), snapshots | Yes | Should batch inside single DB txn |
| PUT /payments/:id/status | kisaan_payments (W) | kisaan_transactions (R) | ledger? snapshots? | Yes | See duplicate variant |
| GET /payments/outstanding | - | kisaan_transactions, kisaan_payments | - | No | Duplicate variant under /transactions |
| POST /balances/payment/farmer | kisaan_payments? (maybe), kisaan_users (W) | kisaan_transactions (R) | ledger, balance_snapshots | Yes | Standardize with unified payment service |
| POST /balances/payment/buyer | kisaan_users (W) | kisaan_transactions (R) | ledger, balance_snapshots | Yes | As above |
| POST /balances/update | kisaan_users (W) | - | ledger? snapshots? | Yes | Should enforce reason_code & invariants |
| GET /balances/history/:userId | - | balance_snapshots (R) | - | No | Consider pagination |
| POST /balance-snapshots/ | balance_snapshots (W) | - | - | Yes? | Should be internal-only (maybe restrict) |
| POST /credit-advances/issue | kisaan_credits (W) | kisaan_users (R/W) | ledger, balance_snapshots | Yes | Add credit limit validation |
| POST /credit-advances/repay | kisaan_credits (W), kisaan_users (W) | - | ledger, balance_snapshots | Yes | Ensure FIFO / interest calc if needed |
| GET /credit-advances/ | - | kisaan_credits (R) | - | No | Filtering/pagination needed |
| POST /commissions/ | kisaan_commissions (W) | - | - | Yes | Unique constraint per shop? |
| PUT /commissions/:id | kisaan_commissions (W) | - | - | Yes | Validate rate/type invariant |
| POST /commissions/calculate | - | kisaan_commissions (R), kisaan_transactions (R) | - | No | Might duplicate service logic |
| POST /settlements/repay-fifo | kisaan_settlements (W), kisaan_payments? (implicit) | kisaan_transactions (R), kisaan_users (R/W) | ledger, balance_snapshots | Yes | Must define ordering + lock strategy |
| GET /settlements/ | - | kisaan_settlements (R) | - | No | Add pagination |
| POST /settlements/settle/:settlement_id | kisaan_settlements (W) | kisaan_transactions (R) | ledger? snapshots? | Yes | Include payment reconciliation |
| POST /settlements/expense | kisaan_settlements (W) | - | audit? | Yes | Expense categorization |

## User / Shop / Product / Plan
| Endpoint | Primary Tables (W) | Secondary Tables (R) | Derived (D) | Transaction Boundary | Notes |
|----------|--------------------|----------------------|-------------|----------------------|-------|
| POST /users/ | kisaan_users (W) | kisaan_shops (R) | audit? | Yes | Add uniqueness + credential hashing check |
| PUT /users/:id | kisaan_users (W) | - | audit? ledger? | Yes | Commission override invariants |
| DELETE /users/:id | kisaan_users (W) | - | audit? | Yes | Soft delete recommendation |
| POST /shops/ | kisaan_shops (W) | kisaan_plans (R), kisaan_users (R) | audit? | Yes | Owner assignment consistency |
| PUT /shops/:id | kisaan_shops (W) | kisaan_plans (R) | audit? | Yes | Changing plan may require usage recalculation |
| POST /plans/ | kisaan_plans (W) | - | - | Yes | Feature JSON validation |
| POST /products/ | kisaan_products (W) | kisaan_categories (R) | - | Yes | Enforce unique (name, category) |
| PUT /products/:id | kisaan_products (W) | - | - | Yes | If status/record_status unify |
| POST /farmer-products/farmers/:farmerId/products | farmer_product_assignment? (W) | kisaan_products (R) | audit? | Yes | Idempotent guard |
| POST /shop-categories/ | kisaan_shop_categories (W) | kisaan_categories (R) | - | Yes | Validate duplicates |

## Logging / Audit / Idempotency
| Endpoint | Primary Tables (W) | Secondary Tables (R) | Derived (D) | Transaction Boundary | Notes |
|----------|--------------------|----------------------|-------------|----------------------|-------|
| GET /audit-logs/ | - | kisaan_audit_logs (R) | - | No | Add filters (action/entity/date) |
| POST /transactions/ (idempotent) | kisaan_transaction_idempotency (W) | kisaan_transactions (R) | - | Yes | Key uniqueness, future payload hash |

## Hotspot Summary
- Multi-table writes without explicit transaction wrappers (payments update, user balance adjustments in some legacy endpoints) must be standardized into service-layer atomic operations.
- Duplicate payment endpoint surfaces (/transactions/payments vs /payments) should consolidate behind one payment service + route alias or deprecation plan.
- Settlement and credit flows require consistent ledger + balance snapshot generation hooks.

## Recommended Refactor Ordering
1. Consolidate payment write paths (single service, enforce txn & ledger). 
2. Add row-level locking (SELECT ... FOR UPDATE) around balance mutations in transactions & payments.
3. Introduce soft delete for transactions & users (if required by business compliance).
4. Add DTO validation (Zod) for settlements, credits, commissions.
5. Normalize commission derivation (remove redundant transaction fields except denormalized snapshot).

---
> Review this draft and confirm before I proceed to Naming & Consistency Audit.
