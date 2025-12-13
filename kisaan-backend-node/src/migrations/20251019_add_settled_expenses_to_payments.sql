-- Migration: Add settled_expenses column to kisaan_payments table
-- Date: 2025-10-19
-- Description: Add settled_expenses array column to track which expenses were settled in a payment

-- Add settled_expenses column (array of expense IDs)
ALTER TABLE kisaan_payments 
ADD COLUMN IF NOT EXISTS settled_expenses INTEGER[];

-- Add comment for documentation
COMMENT ON COLUMN kisaan_payments.settled_expenses IS 'Array of expense IDs that were settled/offset in this payment';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_settled_expenses 
ON kisaan_payments USING GIN (settled_expenses);
