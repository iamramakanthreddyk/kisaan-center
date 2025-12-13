-- Migration: Add product_id to payments if missing
ALTER TABLE kisaan_payments ADD COLUMN IF NOT EXISTS product_id INTEGER;
-- Backfill logic can be added here if mapping is possible
