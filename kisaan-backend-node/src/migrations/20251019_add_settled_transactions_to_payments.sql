-- Migration: Add settled_transactions column to kisaan_payments
ALTER TABLE kisaan_payments ADD COLUMN IF NOT EXISTS settled_transactions jsonb;
