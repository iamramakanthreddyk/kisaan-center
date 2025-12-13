-- Migration: Enhance Expenses with Ledger Link
-- Date: 2025-10-19
-- Description: Add ledger entry reference and categorization to expenses

BEGIN;

-- Add new columns to expenses table
ALTER TABLE kisaan_expenses
ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS category VARCHAR(50)
  CHECK (category IS NULL OR category IN ('transport', 'packaging', 'labor', 'storage', 'misc')),
ADD COLUMN IF NOT EXISTS ledger_entry_id INTEGER UNIQUE
  REFERENCES kisaan_transaction_ledger(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date 
  ON kisaan_expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category 
  ON kisaan_expenses(category) 
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_ledger 
  ON kisaan_expenses(ledger_entry_id);

-- Add comments
COMMENT ON COLUMN kisaan_expenses.expense_date IS 'Date when expense was incurred';
COMMENT ON COLUMN kisaan_expenses.category IS 'Expense category: transport, packaging, labor, storage, misc';
COMMENT ON COLUMN kisaan_expenses.ledger_entry_id IS 'Link to transaction_ledger entry for audit trail';

-- Migrate existing data: set expense_date from created_at
UPDATE kisaan_expenses
SET expense_date = DATE(created_at)
WHERE expense_date IS NULL;

COMMIT;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kisaan_expenses' AND column_name = 'ledger_entry_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: ledger_entry_id not added';
  END IF;
  RAISE NOTICE 'Migration 20251019_02 completed successfully';
END $$;
