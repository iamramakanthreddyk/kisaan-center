-- Migration: Add all missing columns to kisaan_expenses and kisaan_transactions
-- Timestamp: 2025-12-14_14

DO $$
BEGIN
    -- ===== kisaan_expenses table =====
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_expenses' AND column_name = 'category'
    ) THEN
        ALTER TABLE kisaan_expenses ADD COLUMN category VARCHAR(50);
        RAISE NOTICE 'Added category column to kisaan_expenses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_expenses' AND column_name = 'ledger_entry_id'
    ) THEN
        ALTER TABLE kisaan_expenses ADD COLUMN ledger_entry_id BIGINT;
        RAISE NOTICE 'Added ledger_entry_id column to kisaan_expenses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_expenses' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE kisaan_expenses ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to kisaan_expenses';
    END IF;

    -- ===== kisaan_transactions table =====
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN commission_rate DECIMAL(6,4);
        RAISE NOTICE 'Added commission_rate column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'commission_type'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN commission_type VARCHAR(50);
        RAISE NOTICE 'Added commission_type column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added status column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'transaction_date'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN transaction_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added transaction_date column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'settlement_date'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN settlement_date DATE;
        RAISE NOTICE 'Added settlement_date column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'settled_amount'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN settled_amount DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added settled_amount column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'pending_amount'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN pending_amount DECIMAL(12,2);
        RAISE NOTICE 'Added pending_amount column to kisaan_transactions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'settlement_status'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN settlement_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added settlement_status column to kisaan_transactions';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding missing columns: %', SQLERRM;
END$$;
