-- Migration: Make payment_date non-nullable
UPDATE kisaan_payments SET payment_date = NOW() WHERE payment_date IS NULL;
ALTER TABLE kisaan_payments ALTER COLUMN payment_date SET NOT NULL;
