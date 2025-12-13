-- Migration: Enhance Payments for Settlement Tracking
-- Date: 2025-10-19
-- Description: Add settlement type and balance tracking to payments table

BEGIN;

-- Add settlement tracking columns to payments
ALTER TABLE kisaan_payments
ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20) DEFAULT 'partial'
  CHECK (settlement_type IN ('partial', 'full', 'advance', 'adjustment')),
ADD COLUMN IF NOT EXISTS balance_before DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payments_settlement_type 
  ON kisaan_payments(settlement_type);

CREATE INDEX IF NOT EXISTS idx_payments_balance_tracking 
  ON kisaan_payments(payer_type, payment_date DESC) 
  WHERE balance_before IS NOT NULL;

-- Add comments
COMMENT ON COLUMN kisaan_payments.settlement_type IS 'Type: partial, full, advance, adjustment';
COMMENT ON COLUMN kisaan_payments.balance_before IS 'User balance before payment';
COMMENT ON COLUMN kisaan_payments.balance_after IS 'User balance after payment';

-- Migrate existing data: set default settlement type
UPDATE kisaan_payments
SET settlement_type = 'partial'
WHERE settlement_type IS NULL;

COMMIT;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kisaan_payments' AND column_name = 'settlement_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: settlement_type not added';
  END IF;
  RAISE NOTICE 'Migration 20251019_01 completed successfully';
END $$;
