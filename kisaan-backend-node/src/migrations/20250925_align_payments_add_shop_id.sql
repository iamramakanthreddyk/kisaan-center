-- Migration: Ensure payments table has shop_id column (referenced by slim flow test)
-- Reason: Runtime error 'column "shop_id" does not exist' when hitting /payments endpoint.
-- Safe & idempotent: checks for column existence before altering.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_payments' AND column_name='shop_id'
    ) THEN
        ALTER TABLE kisaan_payments ADD COLUMN shop_id BIGINT NULL;
        -- Optional: Future FK reference could be added if shops table stable
        -- ALTER TABLE kisaan_payments ADD CONSTRAINT fk_payments_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added shop_id to kisaan_payments';
    END IF;
END $$;

-- Helpful index for owner/shop queries
CREATE INDEX IF NOT EXISTS idx_kisaan_payments_shop_id ON kisaan_payments(shop_id);
