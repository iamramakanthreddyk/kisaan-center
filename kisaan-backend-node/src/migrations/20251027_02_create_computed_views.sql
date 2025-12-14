-- Migration: Create Computed Views for Balance Validation
-- Date: 2025-10-27
-- Purpose: Create views that compute settlement status from source data (single source of truth)

-- =============================================
-- VIEW 1: Transaction Settlement Status
-- Replaces: transaction.pending_amount, transaction.settlement_status (redundant columns)
-- =============================================

CREATE OR REPLACE VIEW v_transaction_settlement_status AS
SELECT 
  t.id AS transaction_id,
  t.shop_id,
  t.farmer_id,
  t.buyer_id,
  t.total_amount,
  t.farmer_earning,
  t.commission_amount,
  
  -- Buyer paid amount (from PAID allocations)
  COALESCE(SUM(
    CASE 
      WHEN p.payer_type = 'BUYER' 
        AND p.payee_type = 'SHOP' 
        AND p.status = 'PAID' 
      THEN pa.allocated_amount 
      ELSE 0 
    END
  ), 0) AS buyer_paid_amount,
  
  -- Farmer paid amount (from PAID allocations)
  COALESCE(SUM(
    CASE 
      WHEN p.payee_type = 'FARMER' 
        AND p.status = 'PAID' 
      THEN pa.allocated_amount 
      ELSE 0 
    END
  ), 0) AS farmer_paid_amount,
  
  -- Computed pending amounts
  t.total_amount - COALESCE(SUM(
    CASE 
      WHEN p.payer_type = 'BUYER' 
        AND p.payee_type = 'SHOP' 
        AND p.status = 'PAID' 
      THEN pa.allocated_amount 
      ELSE 0 
    END
  ), 0) AS buyer_pending_amount,
  
  t.farmer_earning - COALESCE(SUM(
    CASE 
      WHEN p.payee_type = 'FARMER' 
        AND p.status = 'PAID' 
      THEN pa.allocated_amount 
      ELSE 0 
    END
  ), 0) AS farmer_pending_amount,
  
  -- Computed settlement status
  CASE
    -- Both fully paid (within 0.01 tolerance)
    WHEN (t.total_amount - COALESCE(SUM(
      CASE 
        WHEN p.payer_type = 'BUYER' AND p.payee_type = 'SHOP' AND p.status = 'PAID' 
        THEN pa.allocated_amount ELSE 0 
      END
    ), 0)) < 0.01 
    AND (t.farmer_earning - COALESCE(SUM(
      CASE 
        WHEN p.payee_type = 'FARMER' AND p.status = 'PAID' 
        THEN pa.allocated_amount ELSE 0 
      END
    ), 0)) < 0.01
    THEN 'FULLY_SETTLED'
    
    -- Some payment made
    WHEN COALESCE(SUM(pa.allocated_amount), 0) > 0 
    THEN 'PARTIALLY_SETTLED'
    
    -- No payments
    ELSE 'UNSETTLED'
  END AS computed_settlement_status,
  
  t.created_at,
  t.updated_at
  
FROM kisaan_transactions t
LEFT JOIN payment_allocations pa ON pa.transaction_id = t.id
LEFT JOIN kisaan_payments p ON p.id = pa.payment_id
GROUP BY t.id;

COMMENT ON VIEW v_transaction_settlement_status IS 
  'Computed settlement status from allocations - single source of truth. Use this instead of transaction.pending_amount or transaction.settlement_status columns.';

-- =============================================
-- VIEW 2: Expense Settlement Status
-- Replaces: expense.remaining_amount, expense.allocation_status (redundant columns)
-- =============================================

CREATE OR REPLACE VIEW v_expense_settlement_status AS
SELECT 
  e.id AS expense_id,
  e.shop_id,
  e.user_id,
  e.amount AS total_amount,
  e.type,
  e.transaction_id,
  e.description,
  
  -- Settled amount (from expense_settlements)
  COALESCE(SUM(es.amount), 0) AS settled_amount,
  
  -- Computed remaining amount
  e.amount - COALESCE(SUM(es.amount), 0) AS remaining_amount,
  
  -- Computed status
  CASE
    -- Fully settled (within 0.01 tolerance)
    WHEN (e.amount - COALESCE(SUM(es.amount), 0)) < 0.01 
    THEN 'SETTLED'
    
    -- Partially settled
    WHEN COALESCE(SUM(es.amount), 0) > 0 
    THEN 'PARTIALLY_SETTLED'
    
    -- Not settled
    ELSE 'PENDING'
  END AS computed_status,
  
  e.created_at,
  e.updated_at
  
FROM kisaan_expenses e
LEFT JOIN expense_settlements es ON es.expense_id = e.id
GROUP BY e.id;

COMMENT ON VIEW v_expense_settlement_status IS 
  'Computed expense status from settlements - single source of truth. Use this instead of expense.remaining_amount or expense.allocation_status columns.';

-- =============================================
-- VIEW 3: User Balance Validation
-- Compares stored balance vs computed balance
-- =============================================

CREATE OR REPLACE VIEW v_user_balance_validation AS
WITH farmer_balances AS (
  -- Farmer balance: unpaid earnings - unsettled expenses
  SELECT 
    vts.farmer_id AS user_id,
    SUM(vts.farmer_pending_amount) AS unpaid_earnings,
    COALESCE(expenses.unsettled_total, 0) AS unsettled_expenses,
    SUM(vts.farmer_pending_amount) - COALESCE(expenses.unsettled_total, 0) AS computed_balance
  FROM v_transaction_settlement_status vts
  LEFT JOIN (
    SELECT 
      ves.user_id,
      SUM(ves.remaining_amount) AS unsettled_total
    FROM v_expense_settlement_status ves
    GROUP BY ves.user_id
  ) expenses ON expenses.user_id = vts.farmer_id
  GROUP BY vts.farmer_id, expenses.unsettled_total
),
buyer_balances AS (
  -- Buyer balance: unpaid purchase amounts
  SELECT 
    vts.buyer_id AS user_id,
    SUM(vts.buyer_pending_amount) AS unpaid_purchases,
    SUM(vts.buyer_pending_amount) AS computed_balance
  FROM v_transaction_settlement_status vts
  GROUP BY vts.buyer_id
)
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  u.shop_id,
  u.balance AS stored_balance,
  
  -- Computed balance by role
  CASE 
    WHEN u.role = 'farmer' THEN COALESCE(fb.computed_balance, 0)
    WHEN u.role = 'buyer' THEN COALESCE(bb.computed_balance, 0)
    ELSE 0
  END AS computed_balance,
  
  -- Drift (difference between stored and computed)
  u.balance - CASE 
    WHEN u.role = 'farmer' THEN COALESCE(fb.computed_balance, 0)
    WHEN u.role = 'buyer' THEN COALESCE(bb.computed_balance, 0)
    ELSE 0
  END AS balance_drift,
  
  -- Breakdown for farmers
  CASE WHEN u.role = 'farmer' THEN fb.unpaid_earnings END AS farmer_unpaid_earnings,
  CASE WHEN u.role = 'farmer' THEN fb.unsettled_expenses END AS farmer_unsettled_expenses,
  
  -- Breakdown for buyers
  CASE WHEN u.role = 'buyer' THEN bb.unpaid_purchases END AS buyer_unpaid_purchases,
  
  u.created_at,
  u.updated_at

FROM kisaan_users u
LEFT JOIN farmer_balances fb ON fb.user_id = u.id AND u.role = 'farmer'
LEFT JOIN buyer_balances bb ON bb.user_id = u.id AND u.role = 'buyer'
WHERE u.role IN ('farmer', 'buyer');

COMMENT ON VIEW v_user_balance_validation IS 
  'Computes user balance from first principles and compares with stored balance. Use to detect and fix balance drift.';

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Query 1: Find users with significant balance drift (>0.01)
-- SELECT * FROM v_user_balance_validation 
-- WHERE ABS(balance_drift) > 0.01
-- ORDER BY ABS(balance_drift) DESC;

-- Query 2: Check transaction settlement status accuracy
-- SELECT 
--   t.id,
--   t.settlement_status AS stored_status,
--   v.computed_settlement_status,
--   CASE 
--     WHEN t.settlement_status != v.computed_settlement_status 
--     THEN 'MISMATCH' 
--     ELSE 'OK' 
--   END AS status_check
-- FROM kisaan_transactions t
-- JOIN v_transaction_settlement_status v ON v.transaction_id = t.id
-- WHERE t.settlement_status IS NOT NULL;

-- Query 3: Find expenses with status drift
-- SELECT 
--   e.id,
--   e.status AS stored_status,
--   v.computed_status,
--   CASE 
--     WHEN e.status != v.computed_status 
--     THEN 'MISMATCH' 
--     ELSE 'OK' 
--   END AS status_check
-- FROM kisaan_expenses e
-- JOIN v_expense_settlement_status v ON v.expense_id = e.id;

-- =============================================
-- HELPER FUNCTION: Detect Balance Drift
-- =============================================

CREATE OR REPLACE FUNCTION detect_balance_drift()
RETURNS TABLE (
  user_id BIGINT,
  username VARCHAR,
  role VARCHAR,
  stored DECIMAL,
  computed DECIMAL,
  drift DECIMAL,
  drift_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.user_id,
    v.username,
    v.role::VARCHAR,
    v.stored_balance,
    v.computed_balance,
    v.balance_drift,
    CASE 
      WHEN v.stored_balance != 0 
      THEN ROUND((ABS(v.balance_drift) / ABS(v.stored_balance) * 100)::NUMERIC, 2)
      ELSE 0
    END AS drift_percent
  FROM v_user_balance_validation v
  WHERE ABS(v.balance_drift) > 0.01
  ORDER BY ABS(v.balance_drift) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_balance_drift() IS 
  'Returns all users with balance drift > 0.01. Use for monitoring and fixing data quality issues.';

-- =============================================
-- USAGE EXAMPLES
-- =============================================

-- Example 1: Get balance drift report
-- SELECT * FROM detect_balance_drift();

-- Example 2: Check specific user balance
-- SELECT * FROM v_user_balance_validation WHERE user_id = 123;

-- Example 3: Get transaction settlement details
-- SELECT * FROM v_transaction_settlement_status WHERE transaction_id = 456;

-- Example 4: List all unsettled expenses for a user
-- SELECT * FROM v_expense_settlement_status 
-- WHERE user_id = 789 AND computed_status != 'SETTLED';

-- =============================================
-- ROLLBACK (if needed)
-- =============================================

/*
DROP VIEW IF EXISTS v_user_balance_validation;
DROP VIEW IF EXISTS v_expense_settlement_status;
DROP VIEW IF EXISTS v_transaction_settlement_status;
DROP FUNCTION IF EXISTS detect_balance_drift();
*/
