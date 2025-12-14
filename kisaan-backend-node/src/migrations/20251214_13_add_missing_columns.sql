-- Migration: Add missing columns to kisaan_expenses and kisaan_transactions
-- Timestamp: 2025-12-14_13

DO $$
BEGIN
    -- Add expense_date to kisaan_expenses if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_expenses' AND column_name = 'expense_date'
    ) THEN
        ALTER TABLE kisaan_expenses 
        ADD COLUMN expense_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added expense_date column to kisaan_expenses';
    END IF;

    -- Add product_id to kisaan_transactions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE kisaan_transactions 
        ADD COLUMN product_id BIGINT;
        RAISE NOTICE 'Added product_id column to kisaan_transactions';
    END IF;

    -- Add commission_amount to kisaan_transactions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'commission_amount'
    ) THEN
        ALTER TABLE kisaan_transactions 
        ADD COLUMN commission_amount DECIMAL(12,2);
        RAISE NOTICE 'Added commission_amount column to kisaan_transactions';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding missing columns: %', SQLERRM;
END$$;
