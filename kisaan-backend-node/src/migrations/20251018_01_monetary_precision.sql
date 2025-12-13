-- Migration: Update monetary columns to NUMERIC(18,2)
ALTER TABLE kisaan_payments ALTER COLUMN amount TYPE NUMERIC(18,2);
ALTER TABLE kisaan_transactions ALTER COLUMN total_amount TYPE NUMERIC(18,2);
ALTER TABLE kisaan_transactions ALTER COLUMN farmer_earning TYPE NUMERIC(18,2);
-- Add more columns as needed
