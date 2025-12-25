-- Migration: Add transaction_date column to kisaan_ledger table
-- Date: 20251225
-- Description: Adds transaction_date column to support backdated ledger entries

-- Add transaction_date column to kisaan_ledger table
ALTER TABLE kisaan_ledger
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE;

-- Create index on transaction_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_date
ON kisaan_ledger(transaction_date DESC);

-- Add comment to document the column purpose
COMMENT ON COLUMN kisaan_ledger.transaction_date IS 'The actual date of the transaction (can be backdated). If null, falls back to created_at.';