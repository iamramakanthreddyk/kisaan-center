-- Migration: Add custom_commission_rate to kisaan_users
-- Idempotent: safe to run multiple times
BEGIN;

-- Add column if it does not exist (Postgres supports IF NOT EXISTS for ADD COLUMN)
ALTER TABLE IF EXISTS kisaan_users
  ADD COLUMN IF NOT EXISTS custom_commission_rate DECIMAL(6,4) DEFAULT NULL;

-- Optionally record migration in _migrations ledger if your runner doesn't
-- handle it automatically. The project's run-migration.ts records executed files.

COMMIT;
