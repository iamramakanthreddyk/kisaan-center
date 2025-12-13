# KisaanCenter Digital Mandi System - Core Idea (Business and Technical)

## Problem Statement

Traditional flower markets (mandis) rely on 500+ physical ledgers—one per farmer—to record daily stock, sales, payments, and balances. This manual process is slow, error-prone, and makes end-of-day/week/month reconciliation a major pain for shop owners. Calculations are manual, cash handling is risky, and there is no real-time visibility for farmers, buyers, or owners.

## What the Owner Needs
- Replace 500 books with a digital system.
- Fast, accurate transaction entry during busy sales.
- Automatic calculations (no manual math).
- Clear, real-time farmer-wise ledgers.
- Easy cash and credit reconciliation at day/week/month end.
- Support for all mandi-style flows: sales as they happen, no stock declaration or management required.

## Core Business Flows





### Transaction & Payment Flows
- Each sale creates a Transaction (farmer, product, qty, rate, buyer).
- Payments can be full, partial, or credit (split cash/credit per transaction).
- Commission is calculated per transaction (realized on collection).
- Credits are tracked per buyer, per farmer/product, with repayments and audit trail.
- Advances to farmers are supported and deducted from end-of-day payout.
- All changes (corrections, repayments) are auditable.

### End-of-Day and Ledger Reporting
- Owner sees per-farmer, per-product, and shop-wide summaries: sales, cash, credits, commission, payouts, and net cash.
- Farmer sees their own ledger: sales, payments, credits, and balances.
- Buyer sees purchase and credit history.
- Superadmin sees all shops, plans, and can manage owners and plans.

## Technical Principles
- Single source of truth for all business flows (transactions, payments, credits, commission, audit).
- Schema and API design must support real-time, on-the-fly sales and payment flows without confusion.
- All calculations are automatic and auditable.
- Role-based access: superadmin, owner, farmer, buyer.
- System must be robust to late declarations, corrections, and partial payments.
- UI/UX must make transaction entry fast and error-free (full page, not modal).

## Key Success Metrics
- Transaction entry time < 30 seconds per sale.
- Zero manual calculations needed by owner.
- Farmer ledger available instantly.
- Daily reconciliation automated.
- Error rate < 1% (vs current manual errors).

## Out of Scope (for MVP)
- Analytics, dashboards, and advanced metrics (can be added later).
- Complex plan enforcement or employee permissions.
- Anything not directly related to replacing the physical books.

---

This document is the foundation for all backend, frontend, and database design. All features, APIs, and schema changes must align with these business flows and principles.

i have made changes to the models, please review the mdoodels
are they good to have in db
all tables names, columns, relations are correct ?
make sure to think of core idea and does it solve the problem ??

Nice — here’s a short, crisp reference you can pin to the repo or hand to the team.

# Core idea — short reference (KisaanCenter)

**Objective:** Replace the paper “books” used by shop owners with a lightweight, mobile-friendly owner dashboard that records **every transaction** (buyer→shop, shop→farmer), calculates **shop commission**, and produces per-farmer ledgers and daily/weekly/monthly summaries. Use the existing backend APIs (swagger) and frontend components — implement only what’s needed to make the owner’s day-to-day work painless and auditable.

## Key business rules (must be enforced)

* **Superadmin**: creates/upgrades/downgrades plans and creates owner + shop during owner creation. Only superadmin can change plans.
* **Shop role** is a facilitator — **stock belongs to farmers**, not the shop.
* **Commission**: shop has a commission rate (percentage); commission is calculated per transaction and stored on the transaction record.
* **Transactions are primary**: every sale = one transaction record with `farmer`, `buyer`, `product`, `qty`, `unit_price`, `total`, `shop_commission`, `farmer_earning`.
* **Payments are tracked separately**: buyer→shop and shop→farmer payments are recorded (partial payments allowed). Outstanding balances must be visible.
* **Stock modes**:

  * **Declared**: farmer declares starting stock → sold/balance visible in real time.
  * **Implicit**: transactions create implicit stock records; later declarations reconcile and recalculate balances (with audit trail).
* **Auditability**: every late declaration or adjustment is logged with timestamp and user.

## Operational scale & constraints

* Typical day: \~500 farmers per shop, \~2 products per farmer, avg 35 kg per farmer, buyer buys \~10 kg.
* Stock turns quickly (day → 3 days), so focus on transaction speed and accuracy, not long-term inventory.
* Owner currently keeps 500 physical books — digital system must replace manual calculations and reduce human error.

## Minimum viable features (priority ordered)

1. Owner layout: header + footer + sidebar (basic), mobile-friendly.
2. Owner dashboard: daily transactions summary + quick totals (sales, commission, cash collected, outstanding).
3. CRUD for Owner: add farmers, buyers, assign products/categories to shop.
4. Transaction creation UI: select farmer, buyer, product, qty, price — create transaction → backend stores commission & farmer earning.
5. Payments screen: record buyer payments & shop payouts to farmers (supports partial payments; status).
6. Farmer ledger view: per-farmer daily ledger exportable (PDF/CSV) — declared vs sold vs balance + payments.
7. Day/week/month report pages (aggregate, filter by date/shop/farmer).
8. Reconciliation flow: allow entering late declarations and show audit log & retroactive balance recalculation.
9. Use existing frontend components and map responses to swagger.json — minimal refactor.
10. Tests for transaction/commission/payment flows and common edge cases (partial payments, refunds, concurrent payments).

## UX & integration notes

* Reuse existing components; conform to current API contract (swagger.json).
* Keep forms compact for mobile; use typeahead for farmer/buyer/product selection to speed entry.
* Make transaction entry idempotent (prevent double entries on retries).
* Provide export per-farmer (daily) so owners can hand the record to farmers.

## Success criteria (how owner knows it works)

* Owner can create transactions for the day without pen & paper.
* End-of-day per-farmer ledger matches what would be in the physical book.
* Owner can see outstanding buyer credits and unpaid farmer payouts.
* Superadmin can manage plans; owner’s shop behaves according to assigned plan limits.




