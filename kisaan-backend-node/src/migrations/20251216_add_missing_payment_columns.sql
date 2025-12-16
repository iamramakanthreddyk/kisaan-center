-- Migration: Add missing columns to kisaan_payments to match Sequelize model
ALTER TABLE kisaan_payments
  ADD COLUMN IF NOT EXISTS counterparty_id BIGINT,
  ADD COLUMN IF NOT EXISTS balance_before NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_to_expenses NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_to_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settled_transactions INTEGER[],
  ADD COLUMN IF NOT EXISTS settled_expenses INTEGER[];
