-- Idempotent migration: add commission_rate and settings to kisaan_shops
BEGIN;

ALTER TABLE IF EXISTS kisaan_shops ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE IF EXISTS kisaan_shops ADD COLUMN IF NOT EXISTS settings JSONB;

COMMIT;
