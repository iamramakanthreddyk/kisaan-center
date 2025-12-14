-- Idempotent migration: add email column to kisaan_shops
BEGIN;

-- Add column if missing
ALTER TABLE IF EXISTS kisaan_shops ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMIT;
