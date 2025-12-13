> ✅ **Active**: Core vision & business framing (replaces duplicative master docs sections).

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
