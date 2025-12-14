-- Migration: Add location column to kisaan_shops
-- Idempotent: safe to run multiple times
BEGIN;

ALTER TABLE IF EXISTS kisaan_shops
  ADD COLUMN IF NOT EXISTS location TEXT;

COMMIT;
