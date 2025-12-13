-- Migration: Add Ledger Entry References
-- Date: 2025-10-19
-- Description: Link payments, expenses, and credits to ledger entries for complete audit trail

BEGIN;

-- Add reference columns to transaction_ledger
ALTER TABLE kisaan_transaction_ledger
ADD COLUMN IF NOT EXISTS payment_id INTEGER
  REFERENCES kisaan_payments(id),
ADD COLUMN IF NOT EXISTS expense_id INTEGER
  REFERENCES kisaan_expenses(id),
ADD COLUMN IF NOT EXISTS credit_id INTEGER
  REFERENCES kisaan_credits(id);

-- Add transaction_type column (more descriptive than reason_code)
ALTER TABLE kisaan_transaction_ledger
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(40);

-- Migrate existing data from reason_code to transaction_type
UPDATE kisaan_transaction_ledger
SET transaction_type = reason_code
WHERE transaction_type IS NULL;

-- Add purpose column for detailed descriptions
ALTER TABLE kisaan_transaction_ledger
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_ledger_payment 
  ON kisaan_transaction_ledger(payment_id) 
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_expense 
  ON kisaan_transaction_ledger(expense_id) 
  WHERE expense_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_credit 
  ON kisaan_transaction_ledger(credit_id) 
  WHERE credit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type 
  ON kisaan_transaction_ledger(transaction_type);

-- Add comments for documentation
COMMENT ON COLUMN kisaan_transaction_ledger.payment_id IS 'Link to payment that caused this ledger entry';
COMMENT ON COLUMN kisaan_transaction_ledger.expense_id IS 'Link to expense that caused this ledger entry';
COMMENT ON COLUMN kisaan_transaction_ledger.credit_id IS 'Link to credit advance that caused this ledger entry';
COMMENT ON COLUMN kisaan_transaction_ledger.transaction_type IS 'Type: SALE, PAYMENT, EXPENSE, CREDIT, ADJUSTMENT';
COMMENT ON COLUMN kisaan_transaction_ledger.purpose IS 'Detailed human-readable description of this ledger entry';

COMMIT;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kisaan_transaction_ledger' AND column_name = 'payment_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: payment_id not added to ledger';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kisaan_transaction_ledger' AND column_name = 'transaction_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: transaction_type not added to ledger';
  END IF;
  
  RAISE NOTICE 'Migration 20251019_03 completed successfully';
END $$;
