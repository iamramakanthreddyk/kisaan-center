-- Migration: add applied_to_expenses and applied_to_balance to kisaan_payments
-- Run this against your database (psql "$DATABASE_URL" -f <this-file>)

ALTER TABLE IF EXISTS kisaan_payments
  ADD COLUMN IF NOT EXISTS applied_to_expenses numeric(12,2) DEFAULT 0;

ALTER TABLE IF EXISTS kisaan_payments
  ADD COLUMN IF NOT EXISTS applied_to_balance numeric(12,2) DEFAULT 0;

-- Optionally backfill values from existing allocations (safe default 0)
UPDATE kisaan_payments p
SET applied_to_expenses = COALESCE(p.applied_to_expenses, 0), applied_to_balance = COALESCE(p.applied_to_balance, 0)
WHERE p.applied_to_expenses IS NULL OR p.applied_to_balance IS NULL;
