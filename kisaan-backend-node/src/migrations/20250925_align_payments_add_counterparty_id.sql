-- Migration: Ensure payments table has counterparty_id column
-- Reason: Runtime error missing column when recording payment (buyer/farmer reference)
-- Safe & idempotent

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_payments' AND column_name='counterparty_id'
    ) THEN
        ALTER TABLE kisaan_payments ADD COLUMN counterparty_id BIGINT NULL;
        -- Optional FK (commented to avoid locking issues during hotfix):
        -- ALTER TABLE kisaan_payments ADD CONSTRAINT fk_kisaan_payments_counterparty FOREIGN KEY (counterparty_id) REFERENCES kisaan_users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added counterparty_id to kisaan_payments';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kisaan_payments_counterparty_id ON kisaan_payments(counterparty_id);
