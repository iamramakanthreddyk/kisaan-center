-- Migration: Balance Reconciliation Functions
-- Date: 2025-10-19
-- Description: Create SQL functions to verify balance integrity and reconcile discrepancies

-- Function 1: Get user's calculated balance from ledger
CREATE OR REPLACE FUNCTION get_user_ledger_balance(p_user_id BIGINT)
RETURNS DECIMAL(10,2) AS $$
  SELECT COALESCE(SUM(delta_amount), 0)
  FROM kisaan_transaction_ledger
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL IMMUTABLE;

COMMENT ON FUNCTION get_user_ledger_balance(BIGINT) IS 'Calculate user balance from sum of all ledger entries';

-- Function 2: Check if specific user balance matches ledger
CREATE OR REPLACE FUNCTION check_user_balance(p_user_id BIGINT)
RETURNS TABLE(
  user_id BIGINT,
  stored_balance DECIMAL(10,2),
  ledger_balance DECIMAL(10,2),
  drift DECIMAL(10,2),
  is_balanced BOOLEAN
) AS $$
  SELECT 
    u.id,
    u.balance,
    get_user_ledger_balance(u.id),
    u.balance - get_user_ledger_balance(u.id),
    ABS(u.balance - get_user_ledger_balance(u.id)) < 0.01
  FROM kisaan_users u
  WHERE u.id = p_user_id;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION check_user_balance(BIGINT) IS 'Compare stored balance with ledger calculation for specific user';

-- Function 3: Find all users with balance drift above threshold
CREATE OR REPLACE FUNCTION find_balance_drift(p_threshold DECIMAL DEFAULT 0.01)
RETURNS TABLE(
  user_id BIGINT,
  user_name VARCHAR,
  stored_balance DECIMAL(10,2),
  ledger_balance DECIMAL(10,2),
  drift DECIMAL(10,2)
) AS $$
  SELECT 
    u.id,
    COALESCE(u.firstname, u.username),
    u.balance,
    get_user_ledger_balance(u.id),
    u.balance - get_user_ledger_balance(u.id)
  FROM kisaan_users u
  WHERE ABS(u.balance - get_user_ledger_balance(u.id)) > p_threshold
  ORDER BY ABS(u.balance - get_user_ledger_balance(u.id)) DESC;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION find_balance_drift(DECIMAL) IS 'Find all users with balance drift above threshold (default 0.01)';

-- Function 4: Get comprehensive financial summary for a user
CREATE OR REPLACE FUNCTION get_user_financial_summary(p_user_id BIGINT)
RETURNS TABLE(
  user_id BIGINT,
  user_name VARCHAR,
  current_balance DECIMAL(10,2),
  total_sales DECIMAL(10,2),
  total_payments DECIMAL(10,2),
  total_expenses DECIMAL(10,2),
  total_credits DECIMAL(10,2),
  ledger_balance DECIMAL(10,2),
  is_balanced BOOLEAN
) AS $$
  SELECT 
    u.id,
    COALESCE(u.firstname, u.username),
    u.balance,
    COALESCE(SUM(CASE WHEN l.transaction_type = 'SALE' OR l.reason_code = 'SALE' THEN l.delta_amount END), 0),
    COALESCE(SUM(CASE WHEN l.transaction_type = 'PAYMENT' OR l.reason_code = 'PAYMENT' THEN ABS(l.delta_amount) END), 0),
    COALESCE(SUM(CASE WHEN l.transaction_type = 'EXPENSE' OR l.reason_code = 'EXPENSE' THEN ABS(l.delta_amount) END), 0),
    COALESCE(SUM(CASE WHEN l.transaction_type = 'CREDIT' OR l.reason_code = 'CREDIT' THEN l.delta_amount END), 0),
    COALESCE(SUM(l.delta_amount), 0),
    ABS(u.balance - COALESCE(SUM(l.delta_amount), 0)) < 0.01
  FROM kisaan_users u
  LEFT JOIN kisaan_transaction_ledger l ON l.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.firstname, u.username, u.balance;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION get_user_financial_summary(BIGINT) IS 'Get complete financial breakdown (sales, payments, expenses, credits) for a user';

-- Function 5: System-wide reconciliation summary
CREATE OR REPLACE FUNCTION reconcile_all_balances()
RETURNS TABLE(
  total_users INTEGER,
  balanced_users INTEGER,
  drift_users INTEGER,
  total_drift DECIMAL(10,2)
) AS $$
  SELECT 
    COUNT(*)::INTEGER,
    SUM(CASE WHEN ABS(u.balance - get_user_ledger_balance(u.id)) < 0.01 THEN 1 ELSE 0 END)::INTEGER,
    SUM(CASE WHEN ABS(u.balance - get_user_ledger_balance(u.id)) >= 0.01 THEN 1 ELSE 0 END)::INTEGER,
    SUM(u.balance - get_user_ledger_balance(u.id))
  FROM kisaan_users u;
$$ LANGUAGE SQL;

COMMENT ON FUNCTION reconcile_all_balances() IS 'Get system-wide balance reconciliation summary (total users, balanced, drift count, total drift)';

-- Verification: Show created functions
SELECT 
  'Reconciliation functions created successfully' as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND (p.proname LIKE '%balance%' OR p.proname LIKE '%reconcil%')
AND p.proname IN (
  'get_user_ledger_balance',
  'check_user_balance',
  'find_balance_drift',
  'get_user_financial_summary',
  'reconcile_all_balances'
);
