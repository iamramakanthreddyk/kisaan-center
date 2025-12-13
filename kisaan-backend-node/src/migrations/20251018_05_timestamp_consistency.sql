-- Migration: Ensure all tables use consistent timestamp columns
ALTER TABLE kisaan_payments ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE kisaan_payments ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE kisaan_transactions ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE kisaan_transactions ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
-- Add more tables/columns as needed
