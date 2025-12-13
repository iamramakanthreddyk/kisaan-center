-- Migration: Ledger Enhancements and Settlement Views
-- Date: 2025-10-19
-- Description: Add indexes to ledger for better performance and create comprehensive settlement views

-- Add composite indexes for better query performance
-- Ledger already has payment_id, expense_id, credit_id from migration 03
CREATE INDEX IF NOT EXISTS idx_ledger_payment ON kisaan_transaction_ledger(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_expense ON kisaan_transaction_ledger(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_credit ON kisaan_transaction_ledger(credit_id) WHERE credit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type ON kisaan_transaction_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_user_date ON kisaan_transaction_ledger(user_id, created_at);

COMMENT ON INDEX idx_ledger_payment IS 'Index for finding ledger entries related to specific payments';
COMMENT ON INDEX idx_ledger_expense IS 'Index for finding ledger entries related to specific expenses';
COMMENT ON INDEX idx_ledger_credit IS 'Index for finding ledger entries related to specific credits';

-- Create comprehensive settlement summary view
CREATE OR REPLACE VIEW v_user_settlement_summary AS
SELECT 
  u.id as user_id,
  u.username,
  u.role,
  u.balance as current_balance,
  
  -- Transaction totals (earnings or debts)
  COALESCE(SUM(CASE 
    WHEN u.role = 'farmer' THEN t.farmer_earning 
    WHEN u.role = 'buyer' THEN -t.total_amount 
    ELSE 0
  END), 0) as total_transaction_amount,
  
  -- Settled amounts from transactions
  COALESCE(SUM(CASE 
    WHEN u.role = 'farmer' THEN t.settled_amount
    WHEN u.role = 'buyer' THEN t.settled_amount
    ELSE 0
  END), 0) as total_settled_from_transactions,
  
  -- Pending amounts from transactions
  COALESCE(SUM(CASE 
    WHEN u.role = 'farmer' THEN t.pending_amount
    WHEN u.role = 'buyer' THEN t.pending_amount  
    ELSE 0
  END), 0) as total_pending_from_transactions,
  
  -- Payment totals
  COALESCE(SUM(DISTINCT p.amount), 0) as total_payments_received,
  
  -- Expense totals
  COALESCE(SUM(DISTINCT e.total_amount), 0) as total_expenses,
  COALESCE(SUM(DISTINCT e.allocated_amount), 0) as total_allocated_expenses,
  COALESCE(SUM(DISTINCT e.remaining_amount), 0) as total_unallocated_expenses,
  
  -- Ledger balance (should match current_balance)
  COALESCE(SUM(DISTINCT l.delta_amount), 0) as ledger_calculated_balance,
  
  -- Count of items
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(DISTINCT p.id) as payment_count,
  COUNT(DISTINCT e.id) as expense_count

FROM kisaan_users u
LEFT JOIN kisaan_transactions t ON (
  (u.role = 'farmer' AND t.farmer_id = u.id) OR
  (u.role = 'buyer' AND t.buyer_id = u.id)
)
LEFT JOIN kisaan_payments p ON p.counterparty_id = u.id
LEFT JOIN kisaan_expenses e ON e.user_id = u.id
LEFT JOIN kisaan_transaction_ledger l ON l.user_id = u.id
GROUP BY u.id, u.username, u.role, u.balance;

COMMENT ON VIEW v_user_settlement_summary IS 'Complete settlement summary for each user showing transactions, payments, expenses, and balance reconciliation. Use this for dashboard and reporting.';

-- Create transaction settlement detail view
CREATE OR REPLACE VIEW v_transaction_settlement_detail AS
SELECT 
  t.id as transaction_id,
  t.farmer_id,
  t.buyer_id,
  t.shop_id,
  t.product_name,
  t.farmer_earning as total_amount,
  t.settled_amount,
  t.pending_amount,
  t.settlement_status,
  t.settlement_date,
  
  -- Payment settlements
  COALESCE(SUM(CASE WHEN ts.settlement_type = 'payment' THEN ts.amount ELSE 0 END), 0) as settled_via_payments,
  COUNT(CASE WHEN ts.settlement_type = 'payment' THEN 1 END) as payment_count,
  
  -- Expense offsets
  COALESCE(SUM(CASE WHEN ts.settlement_type = 'expense_offset' THEN ts.amount ELSE 0 END), 0) as settled_via_expenses,
  COUNT(CASE WHEN ts.settlement_type = 'expense_offset' THEN 1 END) as expense_offset_count,
  
  -- Credit offsets
  COALESCE(SUM(CASE WHEN ts.settlement_type = 'credit_offset' THEN ts.amount ELSE 0 END), 0) as settled_via_credits,
  COUNT(CASE WHEN ts.settlement_type = 'credit_offset' THEN 1 END) as credit_offset_count,
  
  -- Adjustments
  COALESCE(SUM(CASE WHEN ts.settlement_type = 'adjustment' THEN ts.amount ELSE 0 END), 0) as settled_via_adjustments,
  
  t.created_at as transaction_date

FROM kisaan_transactions t
LEFT JOIN kisaan_transaction_settlements ts ON ts.transaction_id = t.id
GROUP BY t.id, t.farmer_id, t.buyer_id, t.shop_id, t.product_name, t.farmer_earning, 
         t.settled_amount, t.pending_amount, t.settlement_status, t.settlement_date, t.created_at;

COMMENT ON VIEW v_transaction_settlement_detail IS 'Detailed settlement breakdown for each transaction showing how it was settled (payments, expense offsets, credits, adjustments)';

-- Create expense allocation detail view
CREATE OR REPLACE VIEW v_expense_allocation_detail AS
SELECT 
  e.id as expense_id,
  e.user_id,
  e.shop_id,
  e.transaction_id as linked_transaction_id,
  e.type as expense_type,
  e.category,
  e.total_amount,
  e.allocated_amount,
  e.remaining_amount,
  e.allocation_status,
  e.status as expense_status,
  
  -- Allocation breakdown
  COALESCE(SUM(CASE WHEN ea.allocation_type = 'transaction_offset' THEN ea.allocated_amount ELSE 0 END), 0) as allocated_to_transactions,
  COUNT(CASE WHEN ea.allocation_type = 'transaction_offset' THEN 1 END) as transaction_offset_count,
  
  COALESCE(SUM(CASE WHEN ea.allocation_type = 'balance_settlement' THEN ea.allocated_amount ELSE 0 END), 0) as allocated_to_balance,
  COUNT(CASE WHEN ea.allocation_type = 'balance_settlement' THEN 1 END) as balance_settlement_count,
  
  COALESCE(SUM(CASE WHEN ea.allocation_type = 'advance' THEN ea.allocated_amount ELSE 0 END), 0) as allocated_as_advance,
  
  e.expense_date,
  e.created_at

FROM kisaan_expenses e
LEFT JOIN kisaan_expense_allocations ea ON ea.expense_id = e.id

GROUP BY e.id, e.user_id, e.shop_id, e.transaction_id, e.type, e.category, 
         e.total_amount, e.allocated_amount, e.remaining_amount, e.allocation_status, 
         e.status, e.expense_date, e.created_at;

COMMENT ON VIEW v_expense_allocation_detail IS 'Detailed allocation breakdown for each expense showing how it was allocated (transaction offsets, balance settlements, advances)';

-- Create function to get complete user financial picture
CREATE OR REPLACE FUNCTION get_user_financial_picture(p_user_id BIGINT)
RETURNS TABLE(
  user_id BIGINT,
  username VARCHAR,
  role VARCHAR,
  
  -- Current state
  current_balance DECIMAL(12,2),
  ledger_balance DECIMAL(12,2),
  balance_drift DECIMAL(12,2),
  is_balanced BOOLEAN,
  
  -- Transaction summary
  total_transactions INTEGER,
  pending_transactions INTEGER,
  total_transaction_amount DECIMAL(12,2),
  total_settled DECIMAL(12,2),
  total_pending DECIMAL(12,2),
  
  -- Payment summary
  total_payments INTEGER,
  total_payment_amount DECIMAL(12,2),
  
  -- Expense summary
  total_expenses INTEGER,
  total_expense_amount DECIMAL(12,2),
  allocated_expenses DECIMAL(12,2),
  unallocated_expenses DECIMAL(12,2)
) AS $$
  SELECT 
    u.id,
    u.username,
    u.role,
    
    -- Current balances
    u.balance,
    get_user_ledger_balance(u.id),
    u.balance - get_user_ledger_balance(u.id),
    ABS(u.balance - get_user_ledger_balance(u.id)) < 0.01,
    
    -- Transaction summary
    COUNT(DISTINCT t.id)::INTEGER,
    COUNT(DISTINCT CASE WHEN t.settlement_status != 'fully_settled' THEN t.id END)::INTEGER,
    COALESCE(SUM(DISTINCT CASE 
      WHEN u.role = 'farmer' THEN t.farmer_earning 
      WHEN u.role = 'buyer' THEN t.total_amount 
    END), 0),
    COALESCE(SUM(DISTINCT t.settled_amount), 0),
    COALESCE(SUM(DISTINCT t.pending_amount), 0),
    
    -- Payment summary
    COUNT(DISTINCT p.id)::INTEGER,
    COALESCE(SUM(DISTINCT p.amount), 0),
    
    -- Expense summary
    COUNT(DISTINCT e.id)::INTEGER,
    COALESCE(SUM(DISTINCT e.total_amount), 0),
    COALESCE(SUM(DISTINCT e.allocated_amount), 0),
    COALESCE(SUM(DISTINCT e.remaining_amount), 0)
    
  FROM kisaan_users u
  LEFT JOIN kisaan_transactions t ON (
    (u.role = 'farmer' AND t.farmer_id = u.id) OR
    (u.role = 'buyer' AND t.buyer_id = u.id)
  )
  LEFT JOIN kisaan_payments p ON p.counterparty_id = u.id
  LEFT JOIN kisaan_expenses e ON e.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.username, u.role, u.balance;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION get_user_financial_picture(BIGINT) IS 'Get complete financial summary for a user including transactions, payments, expenses, and balance reconciliation';

-- Verification query
SELECT 
  'Ledger enhancements and settlement views migration complete' as status,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'kisaan_transaction_ledger' AND indexname LIKE 'idx_ledger_%') as new_indexes,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%settlement%') as new_views,
  (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%financial%') as new_functions;
