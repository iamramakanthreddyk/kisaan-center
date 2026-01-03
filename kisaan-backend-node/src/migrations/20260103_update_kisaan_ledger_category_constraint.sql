-- Migration: Update kisaan_ledger category check constraint
-- Date: 20260103
-- Description: Updates the category check constraint to include all allowed categories (sale, deposit, expense, withdrawal, loan, other)

-- Drop the existing constraint that only allows 4 categories
ALTER TABLE kisaan_ledger DROP CONSTRAINT IF EXISTS kisaan_ledger_category_check;

-- Add the new constraint with all 6 allowed categories
ALTER TABLE kisaan_ledger ADD CONSTRAINT kisaan_ledger_category_check
CHECK (category IN ('sale', 'deposit', 'expense', 'withdrawal', 'loan', 'other'));