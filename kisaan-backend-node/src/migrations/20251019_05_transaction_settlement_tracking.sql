-- Migration: Transaction Settlement Tracking
-- Date: 2025-10-19
-- Description: Add fields to track settlement progress on transactions and create settlement history table

-- Add settlement tracking columns to transactions
ALTER TABLE kisaan_transactions 
  ADD COLUMN IF NOT EXISTS settled_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(20) DEFAULT 'pending';

-- Backfill pending_amount from farmer_earning (what's owed to farmer)
UPDATE kisaan_transactions 
SET pending_amount = farmer_earning 
WHERE pending_amount IS NULL;

-- Create transaction settlements table to track all settlement events
CREATE TABLE IF NOT EXISTS kisaan_transaction_settlements (
  id BIGSERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES kisaan_transactions(id) ON DELETE CASCADE,
  settlement_type VARCHAR(20) NOT NULL CHECK (settlement_type IN ('payment', 'expense_offset', 'credit_offset', 'adjustment')),
  reference_id INTEGER, -- payment_id, expense_id, or credit_id
  reference_type VARCHAR(20) CHECK (reference_type IN ('payment', 'expense', 'credit', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_txn_settlements_txn ON kisaan_transaction_settlements(transaction_id);
CREATE INDEX idx_txn_settlements_ref ON kisaan_transaction_settlements(reference_type, reference_id);
CREATE INDEX idx_txn_settlements_date ON kisaan_transaction_settlements(settled_at);

-- Comments for documentation
COMMENT ON TABLE kisaan_transaction_settlements IS 'Tracks all settlement events for a transaction (payments, expense offsets, credit offsets, adjustments). Provides complete audit trail of how a transaction was settled.';
COMMENT ON COLUMN kisaan_transaction_settlements.settlement_type IS 'Type of settlement: payment (cash/transfer), expense_offset (expense paid to user), credit_offset (credit advance used), adjustment (manual correction)';
COMMENT ON COLUMN kisaan_transaction_settlements.reference_id IS 'Foreign key to related record: payment.id, expense.id, or credit.id depending on reference_type';
COMMENT ON COLUMN kisaan_transaction_settlements.amount IS 'Amount settled in this event. Sum of all settlement amounts for a transaction should equal settled_amount on transaction';

COMMENT ON COLUMN kisaan_transactions.settled_amount IS 'Total amount settled via all methods (payments + expense offsets + credits). Should equal sum of settlement records.';
COMMENT ON COLUMN kisaan_transactions.pending_amount IS 'Amount still pending settlement. Should equal (farmer_earning - settled_amount). When 0, transaction is fully settled.';
COMMENT ON COLUMN kisaan_transactions.settlement_status IS 'pending: no settlements, partially_settled: some settled but pending > 0, fully_settled: pending = 0';

-- Function to update transaction settlement status automatically
CREATE OR REPLACE FUNCTION update_transaction_settlement_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_settled DECIMAL(12,2);
  v_farmer_earning DECIMAL(12,2);
  v_pending DECIMAL(12,2);
  v_status VARCHAR(20);
BEGIN
  -- Get total settled amount for this transaction
  SELECT COALESCE(SUM(amount), 0) INTO v_total_settled
  FROM kisaan_transaction_settlements
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  -- Get farmer earning (total to be settled)
  SELECT farmer_earning INTO v_farmer_earning
  FROM kisaan_transactions
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  -- Calculate pending
  v_pending := v_farmer_earning - v_total_settled;
  
  -- Determine status
  IF v_total_settled = 0 THEN
    v_status := 'pending';
  ELSIF v_pending <= 0.01 THEN -- Account for floating point precision
    v_status := 'fully_settled';
  ELSE
    v_status := 'partially_settled';
  END IF;
  
  -- Update transaction
  UPDATE kisaan_transactions
  SET 
    settled_amount = v_total_settled,
    pending_amount = GREATEST(v_pending, 0), -- Don't allow negative
    settlement_status = v_status,
    settlement_date = CASE WHEN v_status = 'fully_settled' THEN NOW() ELSE settlement_date END
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update transaction settlement status when settlements are added/removed
CREATE TRIGGER trg_update_txn_settlement_status
AFTER INSERT OR UPDATE OR DELETE ON kisaan_transaction_settlements
FOR EACH ROW
EXECUTE FUNCTION update_transaction_settlement_status();

COMMENT ON FUNCTION update_transaction_settlement_status() IS 'Automatically updates transaction settled_amount, pending_amount, and settlement_status when settlements are added/modified/removed';

-- Verification query
SELECT 
  'Transaction settlement tracking migration complete' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'kisaan_transactions' AND column_name IN ('settled_amount', 'pending_amount', 'settlement_status')) as new_columns,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'kisaan_transaction_settlements') as new_tables;
