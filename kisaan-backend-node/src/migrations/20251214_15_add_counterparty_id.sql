-- Migration: Add counterparty_id and other missing columns to kisaan_transactions
-- Timestamp: 2025-12-14_15

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_transactions' AND column_name = 'counterparty_id'
    ) THEN
        ALTER TABLE kisaan_transactions ADD COLUMN counterparty_id BIGINT;
        RAISE NOTICE 'Added counterparty_id column to kisaan_transactions';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding counterparty_id column: %', SQLERRM;
END$$;
