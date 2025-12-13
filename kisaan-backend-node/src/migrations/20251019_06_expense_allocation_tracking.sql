-- Migration: Expense Allocation Tracking
-- Date: 2025-10-19
-- Description: Add fields to track how expenses are allocated/offset and create allocation history table

-- Add allocation tracking columns to expenses
ALTER TABLE kisaan_expenses
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS allocation_status VARCHAR(30) DEFAULT 'unallocated';

-- Backfill total_amount and remaining_amount from existing amount
UPDATE kisaan_expenses 
SET 
  total_amount = amount,
  remaining_amount = amount
WHERE total_amount IS NULL;

-- Create expense allocations table to track allocation events
CREATE TABLE IF NOT EXISTS kisaan_expense_allocations (
  id BIGSERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES kisaan_expenses(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES kisaan_transactions(id) ON DELETE SET NULL,
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount > 0),
  allocation_type VARCHAR(30) NOT NULL CHECK (allocation_type IN ('transaction_offset', 'balance_settlement', 'advance', 'adjustment')),
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_expense_alloc_expense ON kisaan_expense_allocations(expense_id);
CREATE INDEX idx_expense_alloc_txn ON kisaan_expense_allocations(transaction_id);
CREATE INDEX idx_expense_alloc_type ON kisaan_expense_allocations(allocation_type);
CREATE INDEX idx_expense_alloc_date ON kisaan_expense_allocations(allocated_at);

-- Comments for documentation
COMMENT ON TABLE kisaan_expense_allocations IS 'Tracks how expenses are allocated/offset against transactions or balance settlements. Provides audit trail of expense usage.';
COMMENT ON COLUMN kisaan_expense_allocations.allocation_type IS 'transaction_offset: expense offsets specific transaction pending amount, balance_settlement: expense offset in final balance payment, advance: advance payment to user, adjustment: manual correction';
COMMENT ON COLUMN kisaan_expense_allocations.transaction_id IS 'For transaction_offset type: which transaction this expense offsets. NULL for balance_settlement or advance types.';
COMMENT ON COLUMN kisaan_expense_allocations.allocated_amount IS 'Amount of expense allocated in this event. Sum of allocations for an expense should equal allocated_amount on expense.';

COMMENT ON COLUMN kisaan_expenses.total_amount IS 'Original expense amount. Immutable after creation.';
COMMENT ON COLUMN kisaan_expenses.allocated_amount IS 'Total amount already allocated/offset. Updated automatically via trigger.';
COMMENT ON COLUMN kisaan_expenses.remaining_amount IS 'Amount not yet allocated. Should equal (total_amount - allocated_amount). When 0, expense is fully allocated.';
COMMENT ON COLUMN kisaan_expenses.allocation_status IS 'unallocated: no allocations, partially_allocated: some allocated but remaining > 0, fully_allocated: remaining = 0';

-- Function to update expense allocation status automatically
CREATE OR REPLACE FUNCTION update_expense_allocation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_allocated DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_remaining DECIMAL(12,2);
  v_status VARCHAR(30);
BEGIN
  -- Get total allocated amount for this expense
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_total_allocated
  FROM kisaan_expense_allocations
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);
  
  -- Get total expense amount
  SELECT total_amount INTO v_total_amount
  FROM kisaan_expenses
  WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);
  
  -- Calculate remaining
  v_remaining := v_total_amount - v_total_allocated;
  
  -- Determine status
  IF v_total_allocated = 0 THEN
    v_status := 'unallocated';
  ELSIF v_remaining <= 0.01 THEN -- Account for floating point precision
    v_status := 'fully_allocated';
  ELSE
    v_status := 'partially_allocated';
  END IF;
  
  -- Update expense
  UPDATE kisaan_expenses
  SET 
    allocated_amount = v_total_allocated,
    remaining_amount = GREATEST(v_remaining, 0), -- Don't allow negative
    allocation_status = v_status,
    status = CASE WHEN v_status = 'fully_allocated' THEN 'settled' ELSE status END
  WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update expense allocation status when allocations are added/removed
CREATE TRIGGER trg_update_expense_allocation_status
AFTER INSERT OR UPDATE OR DELETE ON kisaan_expense_allocations
FOR EACH ROW
EXECUTE FUNCTION update_expense_allocation_status();

COMMENT ON FUNCTION update_expense_allocation_status() IS 'Automatically updates expense allocated_amount, remaining_amount, and allocation_status when allocations are added/modified/removed';

-- Function to get expense allocation summary
CREATE OR REPLACE FUNCTION get_expense_allocation_summary(p_expense_id INTEGER)
RETURNS TABLE(
  expense_id INTEGER,
  total_amount DECIMAL(12,2),
  allocated_amount DECIMAL(12,2),
  remaining_amount DECIMAL(12,2),
  allocation_status VARCHAR(30),
  allocation_count INTEGER,
  transaction_offsets INTEGER,
  balance_settlements INTEGER,
  advances INTEGER
) AS $$
  SELECT 
    e.id,
    e.total_amount,
    e.allocated_amount,
    e.remaining_amount,
    e.allocation_status,
    COUNT(ea.id)::INTEGER,
    SUM(CASE WHEN ea.allocation_type = 'transaction_offset' THEN 1 ELSE 0 END)::INTEGER,
    SUM(CASE WHEN ea.allocation_type = 'balance_settlement' THEN 1 ELSE 0 END)::INTEGER,
    SUM(CASE WHEN ea.allocation_type = 'advance' THEN 1 ELSE 0 END)::INTEGER
  FROM kisaan_expenses e
  LEFT JOIN kisaan_expense_allocations ea ON ea.expense_id = e.id
  WHERE e.id = p_expense_id
  GROUP BY e.id, e.total_amount, e.allocated_amount, e.remaining_amount, e.allocation_status;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION get_expense_allocation_summary(INTEGER) IS 'Get complete allocation summary for an expense including breakdown by allocation type';

-- Verification query
SELECT 
  'Expense allocation tracking migration complete' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'kisaan_expenses' AND column_name IN ('total_amount', 'allocated_amount', 'remaining_amount', 'allocation_status')) as new_columns,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'kisaan_expense_allocations') as new_tables;
