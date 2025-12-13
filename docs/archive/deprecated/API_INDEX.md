# API Index (Initial Extraction)

This file is auto-generated (first pass) from route declarations. We'll refine per-endpoint with issues and status as we audit.

| Method | Path (relative to router mount) | Source File | Handler / Notes | Known / Suspected Issues | Audit Status |
|--------|----------------------------------|-------------|-----------------|--------------------------|--------------|
| GET | /transactions/ | transactionRoutes | Inline handler using repository pagination | Needs auth role checks consistency; context requirement added | Pending |
| POST | /transactions/ | transactionRoutes | createTransaction (controller) | Verify full transactional atomicity | Pending |
| POST | /transactions/quick | transactionRoutes | service.createQuickTransaction | Product normalization not enforced | Pending |
| GET | /transactions/analytics | transactionRoutes | Raw SQL aggregations | Multiple queries; risk of drift; add param validation | Pending |
| GET | /transactions/shop/:shopId/list | transactionRoutes | getTransactionsByShop | Potential duplication with /transactions? | Pending |
| GET | /transactions/farmer/:farmerId/list | transactionRoutes | Inline raw SQL | No pagination, no auth role check | Pending |
| GET | /transactions/buyer/:buyerId/list | transactionRoutes | Inline raw SQL | No pagination, no auth role check | Pending |
| GET | /transactions/:id | transactionRoutes | getTransactionById | Response mapping? verify error codes | Pending |
| PUT | /transactions/:id | transactionRoutes | Inline update with whitelist | Lacks transaction, no audit log | Pending |
| DELETE | /transactions/:id | transactionRoutes | Inline delete | No soft delete, no auth role check | Pending |
| GET | /transactions/shop/:shopId | transactionRoutes | getTransactionsByShop | Redundant path vs /list variant | Pending |
| GET | /transactions/shop/:shopId/earnings | transactionRoutes | getShopEarnings | Check aggregation accuracy | Pending |
| GET | /transactions/farmer/:farmerId/earnings | transactionRoutes | getFarmerEarnings | Check time range filters | Pending |
| GET | /transactions/farmers/:farmerId/payments | transactionRoutes | getPaymentsToFarmer | Naming inconsistency (farmers vs farmer) | Pending |
| GET | /transactions/buyers/:buyerId/payments | transactionRoutes | getPaymentsByBuyer | Duplicate coverage with /payments? | Pending |
| GET | /transactions/buyers/:buyerId/purchases | transactionRoutes | getPurchasesByBuyer | Validate pagination | Pending |
| POST | /transactions/payments | transactionRoutes | createPayment | Ensure idempotency on retries | Pending |
| PUT | /transactions/payments/:id/status | transactionRoutes | updatePaymentStatus | Validate allowed status transitions | Pending |
| GET | /transactions/payments/transaction/:transactionId | transactionRoutes | getPaymentsByTransaction | Add pagination? | Pending |
| GET | /transactions/payments/outstanding | transactionRoutes | getOutstandingPayments | Filter completeness | Pending |
| POST | /settlements/repay-fifo | settlementRoutes | repay FIFO logic | Concurrency & ordering correctness | Pending |
| GET | /settlements/ | settlementRoutes | list settlements | Pagination? filtering? | Pending |
| GET | /settlements/summary | settlementRoutes | summary controller | Heavy aggregation – optimize? | Pending |
| POST | /settlements/settle/:settlement_id | settlementRoutes | settleAmountController | Atomicity & balance updates | Pending |
| POST | /settlements/expense | settlementRoutes | createExpenseController | Validation coverage | Pending |
| POST | /settlements/ | settlementRoutes | inline create | Inline logic duplication? | Pending |
| GET | /settlements/:id | settlementRoutes | inline fetch | Error code consistency | Pending |
| POST | /commissions/ | commissionRoutes | createCommission | Commission rate validation | Pending |
| GET | /commissions/ | commissionRoutes | getAllCommissions | Add pagination | Pending |
| GET | /commissions/shop/:shopId | commissionRoutes | getCommissionsByShop | | Pending |
| PUT | /commissions/:id | commissionRoutes | updateCommission | Partial update validation | Pending |
| POST | /commissions/calculate | commissionRoutes | inline calc | Business rule duplication risk | Pending |
| GET | /payments/ | paymentRoutes | list payments | Needs pagination meta | Pending |
| POST | /payments/ | paymentRoutes | createPayment | Duplicate vs /transactions/payments | Pending |
| POST | /payments/bulk | paymentRoutes | createBulkPayments | Transactional batching | Pending |
| PUT | /payments/:id/status | paymentRoutes | updatePaymentStatus | Same as transactions scoped version | Pending |
| GET | /payments/transaction/:transactionId | paymentRoutes | getPaymentsByTransaction | Duplicate vs transactions variant | Pending |
| GET | /payments/outstanding | paymentRoutes | getOutstandingPayments | Potential duplication | Pending |
| GET | /payments/farmers/:farmerId | paymentRoutes | getPaymentsToFarmer | Path naming difference vs transactions | Pending |
| GET | /payments/buyers/:buyerId | paymentRoutes | getPaymentsByBuyer | | Pending |
| GET | /products/test | productRoutes | test handler | Remove in prod | Pending |
| POST | /products/ | productRoutes | createProduct | Validation completeness | Pending |
| GET | /products/ | productRoutes | getProducts | Add pagination | Pending |
| GET | /products/:id | productRoutes | getProductById | Error code standardization check | Pending |
| PUT | /products/:id | productRoutes | updateProduct | Allowlist fields? | Pending |
| DELETE | /products/:id | productRoutes | deleteProduct | Soft delete? | Pending |
| GET | /reports/generate | reportRoutes | generateReport | Long-running; async job? | Pending |
| GET | /reports/download | reportRoutes | downloadReport | AuthZ & token expiry | Pending |
| GET | /superadmin/dashboard | superadminRoutes | getSuperadminDashboard | Enforce role guard (present) | Pending |
| GET | /farmer-products/farmers/:farmerId/products | farmerProductRoutes | list farmer products | Add pagination | Pending |
| POST | /farmer-products/farmers/:farmerId/products | farmerProductRoutes | assign product | Idempotency & duplicate prevention | Pending |
| GET | /audit-logs/ | auditLogRoutes | getAuditLogs | Filtering & pagination | Pending |
| POST | /auth/login | authRoutes | loginController | Rate limiting | Pending |
| POST | /auth/logout | authRoutes | logout inline | Should revoke token? | Pending |
| POST | /balances/payment/farmer | balanceRoutes | pay farmer | Atomic ledger vs balance consistency | Pending |
| POST | /balances/payment/buyer | balanceRoutes | buyer payment | Atomic ledger vs balance consistency | Pending |
| GET | /balances/user/:userId | balanceRoutes | get user balance | Cache? | Pending |
| GET | /balances/shop/:shopId | balanceRoutes | get shop balance | Cache? | Pending |
| POST | /balances/update | balanceRoutes | update balance | Race condition risk | Pending |
| GET | /balances/history/:userId | balanceRoutes | balance history | Pagination? | Pending |
| POST | /balance-snapshots/ | balanceSnapshotRoutes | createSnapshot | Access control | Pending |
| GET | /balance-snapshots/:user_id | balanceSnapshotRoutes | getSnapshots | Pagination? | Pending |
| GET | /credit-advances/ | creditAdvanceRoutes | list credits | Filtering & pagination | Pending |
| POST | /credit-advances/issue | creditAdvanceRoutes | issueCredit | Validation & limits | Pending |
| POST | /credit-advances/repay | creditAdvanceRoutes | repayCredit | Ordering & amount > balance | Pending |
| GET | /owner-dashboard/ | ownerDashboardRoute | composite metrics | Performance & N+1 risk | Pending |
| GET | /users/me | userRoutes | getCurrentUser | Ensure minimal PII | Pending |
| POST | /users/ | userRoutes | createUser | Password policy | Pending |
| GET | /users/ | userRoutes | getUsers | Pagination meta | Pending |
| GET | /users/:id | userRoutes | getUserById | Error code consistency | Pending |
| PUT | /users/:id | userRoutes | updateUser | Partial validation | Pending |
| DELETE | /users/:id | userRoutes | deleteUser | Soft delete? | Pending |
| POST | /users/:id/reset-password | userRoutes | resetPassword | Token invalidation | Pending |
| POST | /users/:id/admin-reset-password | userRoutes | adminResetPassword | Audit logging | Pending |

## Next Steps
1. Confirm prioritization approach (suggest starting with Transactions core CRUD & Payments due to financial correctness impact).
2. For each endpoint: fill in Issue column with concrete findings + remediation status (Planned, In Progress, Done).
3. Begin systematic remediation.

### Idempotency (New)
POST /transactions/ now supports optional header `Idempotency-Key`.
- Supply a stable UUID/string per client attempt. If the exact creation succeeds, a retry with the same key returns the original transaction.
- Backed by table `kisaan_transaction_idempotency` (migration: `20250924_create_transaction_idempotency.ts`).
- Conflict behavior: If key exists with attached transaction_id we fetch & return it. (Future enhancement: detect mismatched payload hash.)

Table schema key points:
- key UNIQUE, buyer_id / farmer_id / shop_id indexed
- transaction_id nullable until initial insert commits
- total_amount stored for potential future payload hash or validation

Operational notes:
- Run migrations before deploying updated service.
- If a migration framework command is standardized (e.g. `npm run migrate`), ensure this file executes in order.
- Future improvement: add payload hash & expiration TTL index.

### Atomic Balance & Ledger Updates (Update)
Transaction creation now executes user balance updates and ledger entries inside the same DB transaction:
- User repository updates receive the Sequelize transaction handle.
- Ledger insert failure triggers rollback (no silent partial state).
- Structured console log emitted with: id, shop_id, farmer_id, buyer_id, total_amount, commission_amount, commission_rate, idempotency_key.

Planned enhancements:
- Replace console with centralized logger (correlation / trace id)
- Add SELECT ... FOR UPDATE row locking on kisaan_users for farmer & buyer if contention observed
- Introduce retry/backoff strategy on deadlocks

> This is a living document; tooling can later generate this automatically from route reflection.
