# Core Domain Logic Flows (Draft)

Date: 2025-09-24
Status: Initial draft — aligns with ERD, API ↔ Table mapping, Naming Audit. To be refined after review.

## Legend
- TXN: Database transaction boundary
- LCK: Row-level lock (future) using `SELECT ... FOR UPDATE`
- LEDGER: Insert into `kisaan_transaction_ledger`
- SNAPSHOT: Insert into `balance_snapshots` (will be renamed/prefixed per conventions)
- IDEMP: Row in `kisaan_transaction_idempotency`

## 1. Transaction Creation (Standard `POST /transactions/`)

### Sequence (Happy Path)
1. (Input) Accept payload (shop_id, farmer_id, buyer_id, product_id, quantity, unit_price, commission_rate, derived totals) + optional `Idempotency-Key` header.
2. IDEMP pre-check:
   - If key present: lookup in `kisaan_transaction_idempotency` (by key & shop scope). Return existing transaction if found (idempotent replay) — no side effects.
3. TXN BEGIN
4. Fetch & validate domain entities in parallel (shop, farmer, buyer, product, commission config) — fail fast if any missing.
5. Recompute monetary invariants server-side:
   - `recalc_total = quantity * unit_price`
   - `expected_commission = recalc_total * (commission_rate / 100)` (round 2-4 decimals per policy)
   - `expected_farmer_earning = recalc_total - expected_commission`
   - Invariant: `expected_farmer_earning + expected_commission == recalc_total`
6. Persist `kisaan_transactions` row with snapshot fields (commission_rate, commission_type, farmer_earning, commission_amount, total_amount canonicalization TBD).
7. Update user balance fields (buyer debit, farmer credit, shop commission allocation) — LCK planned on affected `kisaan_users` rows.
8. Insert LEDGER entries (one per balance mutation) capturing: user_id, delta, reason_code (e.g., TXN_CREATE_BUYER_DEBIT / TXN_CREATE_FARMER_CREDIT / TXN_CREATE_SHOP_COMMISSION), linkage transaction_id.
9. Insert balance SNAPSHOT rows (optional optimization: defer heavy snapshotting to async job; currently synchronous for correctness).
10. Insert IDEMP row (if key present) linking key → transaction_id, hashed payload (future) & status.
11. TXN COMMIT
12. Return 201 with transaction DTO (includes derived & canonical fields).

### Failure / Edge Paths
- Missing entity → rollback, return failureCode (NOT_FOUND_*).
- Invariant mismatch (payload tampered) → rollback, return TRANSACTION_DERIVATION_MISMATCH (new code to add) — propose rejecting client derived mismatch.
- Idempotency conflict (key reused with different payload hash) → rollback, return TRANSACTION_IDEMPOTENCY_CONFLICT.
- Deadlock / lock timeout (future with LCK) → safe retry logic (idempotent via key) or propagate 503 with retry-after header.

### Required Invariants
| Invariant | Enforcement Layer | Action on Violation |
|-----------|-------------------|---------------------|
| quantity > 0 | Validation schema | Reject 400 |
| unit_price >= 0 | Validation schema | Reject 400 |
| commission_rate between 0 and 100 | Validation schema | Reject 400 |
| farmer_earning + commission_amount == total_amount | Service recompute | Override or reject (decide) |
| All referenced users belong to same shop (if required) | Service checks | Reject 409 |
| Product active & belongs to shop/category set | Service checks | Reject 409 |

### Future Enhancements
- Row-level locking for balance consistency.
- Hash & compare idempotency payload to detect semantic drift.
- Central monetary rounding util using banker's rounding to avoid bias.

## 2. Quick Transaction Creation (`POST /transactions/quick`)
Variant of standard flow with relaxed or inferred product data.

Differences:
- Product may be optional; product_name accepted directly (snapshot field) — risk of inconsistency if later product added.
- Should still recompute monetary invariants.
- Idempotency recommended (header optional currently) — enforce parity with standard endpoint.
- Same balance & ledger logic; ensure it delegates to a shared service path to avoid divergence.

Action: Unify both endpoints inside the same TransactionService with a mode flag (quick=true) to reduce code drift.

## 3. Payment Creation (`POST /transactions/payments` and `POST /payments/`)

Goal: Apply a payment to settle (partially or fully) one or more transactions or outstanding balances.

### Proposed Standardized Sequence
1. Accept payload: transaction_id (or list), payer_type (BUYER/SHOP), payee_type (SHOP/FARMER), amount, method, payment_date, reference.
2. TXN BEGIN
3. Validate transaction existence and status; recompute outstanding: `outstanding = transaction.total_amount - SUM(confirmed payments)`.
4. Invariant: `0 < amount <= outstanding` (unless overpayment path flagged & creates credit advance).
5. LCK user rows for payer and payee.
6. Insert payment row (status = PENDING or PAID if immediate capture semantics).
7. Adjust balances accordingly (payer balance decreases, payee balance increases or buyer liability decreases depending on model semantics).
8. Insert LEDGER entries (PAYMENT_APPLY_DEBIT / PAYMENT_APPLY_CREDIT) referencing payment_id & transaction_id.
9. Insert SNAPSHOT rows for both users.
10. If payment fully settles transaction, update transaction status = SETTLED (future addition) and/or create settlement linkage.
11. TXN COMMIT
12. Return payment DTO with updated outstanding for affected transaction(s).

### Edge Cases
- Overpayment: create credit advance entry (CreditAdvance: user_id, amount, reason=OVERPAYMENT) and ledger entries.
- Duplicate payment request: idempotency optional; consider payment reference uniqueness per shop.
- Partial payment concurrency: second concurrent payment must see updated outstanding (requires at least READ COMMITTED + possibly SELECT FOR UPDATE on payments filtered by transaction_id).

## 4. Payment Status Transition (`PUT /payments/:id/status`)

Used for marking PENDING → PAID or reversing.

### Rules
- Allowed transitions: PENDING → PAID, PENDING → FAILED, PAID → REVERSED (future).
- TXN boundary to adjust balances only on transition that affects financial state (e.g., marking PAID triggers balance changes if not applied at creation time).
- Invariant: Cannot transition if already terminal (FAILED/REVERSED) unless to a compensating state supported by policy.

## 5. Settlement FIFO Repayment (`POST /settlements/repay-fifo`)

Objective: Repay a sequence of outstanding liabilities (e.g., buyer or farmer debts) in FIFO order.

### Sequence
1. Determine scope (e.g., buyer_id) & fetch unpaid transactions ordered by transaction_date ASC.
2. TXN BEGIN
3. Apply inbound amount across transactions iteratively:
   - For each transaction: compute remaining outstanding.
   - Allocate min(remaining_amount, outstanding) → create payment_allocations row linking settlement/payment to transaction.
   - Decrement remaining_amount.
4. Update / insert settlement record summarizing allocations, total_applied, residual (if any).
5. Create or update payment(s) tied to allocations (or treat settlement as meta-entity referencing multiple payments).
6. Update balances & LEDGER per allocation (batched or one per allocation). Consider grouping for performance.
7. SNAPSHOT for participants at end.
8. TXN COMMIT
9. Return settlement DTO with allocation breakdown.

### Invariants
| Invariant | Enforcement |
|----------|-------------|
| Allocations sum == applied amount | Loop accumulation check |
| No allocation exceeds transaction outstanding | Pre-check each iteration |
| Remaining_amount >= 0 at end | Assert |

### Concurrency Risks
- Parallel FIFO operations on same user causing double allocation. Mitigation: SELECT FOR UPDATE on target transactions set at fetch step.

## 6. Credit Advance Issue & Repay

### Issue (`POST /credit-advances/issue`)
- Validate user within allowable credit policy (future: credit_limit on user/shop).
- TXN: create credit advance row (status=active), credit ledger entry, increment user balance or create liability depending on model semantics.

### Repay (`POST /credit-advances/repay`)
- TXN: decrement outstanding principal; if zero → status=repaid.
- LEDGER entries for repayment debit/credit.
- SNAPSHOT user balance post adjustment.

### Invariants
| Invariant | Enforcement |
|----------|-------------|
| active credit exists | Query + status check |
| repayment_amount <= outstanding | Pre-check |
| status transitions valid | Enum validator |

## 7. Balance Snapshot Strategy

Current: Snapshot per financial mutation (transaction create, payment, credit events).
Pros: Point-in-time reconstruction straightforward.
Cons: High write amplification.

Optimization Plan:
- Option A: Keep immediate snapshots but move to append-only partitioned table.
- Option B: Reduce to periodic (hourly/daily) plus ledger rollups.

Decision Pending: For now, maintain correctness > optimization. Provide config flag later.

## 8. Ledger Design Principles

- Immutable, append-only.
- Each financial affecting API path must emit deterministic set of ledger rows.
- Reason codes enumerated (define central enum: `LEDGER_REASON`).
- Invariant: Sum(ledger.amount where user_id = X) = user.current_balance (modulo timing if snapshots asynchronous).
- Future: Introduce verification task that reconciles ledger vs balance nightly.

## 9. Idempotency Strategy

Current: Key ensures single creation of a transaction.
Future Enhancements:
- Store payload hash (stable canonical serialization) to detect divergent retries.
- Add expiration & cleanup job (status consumed, older than N days).
- Expand to payments to avoid duplicate payment posts under flaky network conditions.

## 10. Concurrency & Locking Plan (Phase 1)

Introduce selective row-level locks within existing TXN wrapper:
| Operation | Rows to Lock | Purpose |
|-----------|--------------|---------|
| Transaction create | buyer user row, farmer user row, shop row (optional) | Prevent concurrent balance race |
| Payment apply | payer & payee user rows + target transaction row | Ensure outstanding & balances consistent |
| FIFO settlement | All candidate transactions set + user row | Avoid double allocation |
| Credit issue/repay | User row | Prevent overlapping modifications |

Implementation (Sequelize): use `transaction.LOCK.UPDATE` with `FOR UPDATE` queries.

## 11. Validation Layer Roadmap

Add Zod schemas for:
- TransactionCreateRequest
- PaymentCreateRequest
- PaymentStatusUpdateRequest
- SettlementRepayFIFORequest
- CreditAdvanceIssueRequest / CreditAdvanceRepayRequest

Each schema enforces numeric bounds, enum domain, structural integrity before hitting service logic.

## 12. Open Decisions
1. Reject vs auto-correct mismatched derived monetary fields? (Recommend reject to expose client drift.)
2. When to settle transaction status? At full payment application or via explicit settlement endpoint? (Lean: automatic at full payment.)
3. Balance snapshots frequency strategy (high write vs batch). Decide before scale.
4. Payment idempotency: adopt same header or dedicated (Payment-Idempotency-Key)?

## 13. Next Steps After Approval
1. Implement payload hash & invariant rejection codes.
2. Add row-level locks to transaction & payment flows.
3. Consolidate duplicate payment endpoints.
4. Add Zod validation layer + DTO exports.
5. Prepare migrations for decimal normalization & field consolidation.

---
Provide feedback or "approve logic flows" to proceed to remediation recommendations.
