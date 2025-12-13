-- Data Fix Script: Repair Common Data Quality Issues
-- Date: 2025-10-27
-- Purpose: Fix data violations found during constraint validation
-- WARNING: Review and test on staging before running on production!

-- =============================================
-- BACKUP FIRST!
-- =============================================
-- CREATE TABLE kisaan_users_backup AS SELECT * FROM kisaan_users;
-- CREATE TABLE kisaan_transactions_backup AS SELECT * FROM kisaan_transactions;

BEGIN;

-- =============================================
-- FIX 1: Users with invalid role-shop_id combinations
-- =============================================

-- Issue: Owners with shop_id (should be NULL)
UPDATE kisaan_users
SET shop_id = NULL
WHERE role = 'owner' AND shop_id IS NOT NULL;

-- Log the fix
DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Fixed % owners who had shop_id (set to NULL)', v_count;
    END IF;
END $$;

-- Issue: Farmers/Buyers without shop_id
-- This is more complex - we can't automatically assign them to a shop
-- Instead, mark these users for manual review
UPDATE kisaan_users
SET status = 'inactive',
    notes = COALESCE(notes, '') || ' [AUTO-FIX: Missing shop_id, needs manual review]'
WHERE role IN ('farmer', 'buyer') 
  AND shop_id IS NULL
  AND status != 'inactive';

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE WARNING 'Marked % farmers/buyers as inactive due to missing shop_id (needs manual fix)', v_count;
    END IF;
END $$;

-- =============================================
-- FIX 2: Transaction amount inconsistencies
-- =============================================

-- Issue: total_amount != commission_amount + farmer_earning
-- Recalculate commission_amount based on total_amount and farmer_earning
UPDATE kisaan_transactions
SET commission_amount = total_amount - farmer_earning
WHERE ABS(total_amount - (commission_amount + farmer_earning)) >= 0.01
  AND total_amount >= farmer_earning;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Fixed % transactions with amount inconsistencies', v_count;
    END IF;
END $$;

-- Issue: Negative amounts (mark for review)
UPDATE kisaan_transactions
SET notes = COALESCE(notes, '') || ' [AUTO-FIX: Had negative amounts, needs manual review]',
    status = 'cancelled'
WHERE (total_amount < 0 OR commission_amount < 0 OR farmer_earning < 0)
  AND status != 'cancelled';

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE WARNING 'Cancelled % transactions with negative amounts (needs manual fix)', v_count;
    END IF;
END $$;

-- =============================================
-- FIX 3: Payment amount issues
-- =============================================

-- Issue: Payments with zero or negative amounts (mark as FAILED)
UPDATE kisaan_payments
SET status = 'FAILED',
    notes = COALESCE(notes, '') || ' [AUTO-FIX: Invalid amount]'
WHERE amount <= 0 AND status != 'FAILED';

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Marked % payments as FAILED due to invalid amounts', v_count;
    END IF;
END $$;

-- =============================================
-- FIX 4: Expense amount issues
-- =============================================

-- Issue: Expenses with zero or negative amounts (mark for review)
UPDATE kisaan_expenses
SET status = 'cancelled',
    description = COALESCE(description, '') || ' [AUTO-FIX: Invalid amount]'
WHERE amount <= 0 AND status != 'cancelled';

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Cancelled % expenses with invalid amounts', v_count;
    END IF;
END $$;

-- Issue: total_amount != amount (sync them)
UPDATE kisaan_expenses
SET total_amount = amount
WHERE total_amount IS NOT NULL 
  AND ABS(total_amount - amount) >= 0.01;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Synced total_amount with amount for % expenses', v_count;
    END IF;
END $$;

-- =============================================
-- FIX 5: Allocation amount issues
-- =============================================

-- Issue: Payment allocations with zero or negative amounts
DELETE FROM payment_allocations
WHERE allocated_amount <= 0;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Deleted % payment allocations with invalid amounts', v_count;
    END IF;
END $$;

-- Issue: Expense settlements with zero or negative amounts
DELETE FROM expense_settlements
WHERE amount <= 0;

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Deleted % expense settlements with invalid amounts', v_count;
    END IF;
END $$;

-- =============================================
-- FIX 6: Fix unreasonable user balances
-- =============================================

-- Issue: Balances outside reasonable range (-10M to +10M)
-- Reset to computed balance from view
UPDATE kisaan_users u
SET balance = v.computed_balance,
    notes = COALESCE(u.notes, '') || ' [AUTO-FIX: Balance was outside range, reset to computed]'
FROM v_user_balance_validation v
WHERE u.id = v.user_id
  AND (u.balance < -10000000 OR u.balance > 10000000);

DO $$
DECLARE
    v_count INT;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE 'Reset % user balances that were outside reasonable range', v_count;
    END IF;
END $$;

-- =============================================
-- VALIDATION: Check if fixes resolved issues
-- =============================================

DO $$
DECLARE
    v_user_violations INT;
    v_txn_violations INT;
    v_payment_violations INT;
    v_expense_violations INT;
BEGIN
    -- Check users
    SELECT COUNT(*) INTO v_user_violations
    FROM kisaan_users
    WHERE ((role = 'owner' AND shop_id IS NOT NULL)
       OR (role IN ('farmer', 'buyer') AND shop_id IS NULL AND status = 'active'))
      AND role IN ('owner', 'farmer', 'buyer');
    
    -- Check transactions
    SELECT COUNT(*) INTO v_txn_violations
    FROM kisaan_transactions
    WHERE (ABS(total_amount - (commission_amount + farmer_earning)) >= 0.01
       OR total_amount < 0 
       OR commission_amount < 0 
       OR farmer_earning < 0)
      AND status NOT IN ('cancelled');
    
    -- Check payments
    SELECT COUNT(*) INTO v_payment_violations
    FROM kisaan_payments
    WHERE amount <= 0 AND status NOT IN ('FAILED', 'CANCELLED');
    
    -- Check expenses
    SELECT COUNT(*) INTO v_expense_violations
    FROM kisaan_expenses
    WHERE amount <= 0 AND status != 'cancelled';
    
    -- Report
    RAISE NOTICE '=== POST-FIX VALIDATION ===';
    RAISE NOTICE 'Remaining user violations: %', v_user_violations;
    RAISE NOTICE 'Remaining transaction violations: %', v_txn_violations;
    RAISE NOTICE 'Remaining payment violations: %', v_payment_violations;
    RAISE NOTICE 'Remaining expense violations: %', v_expense_violations;
    
    IF v_user_violations + v_txn_violations + v_payment_violations + v_expense_violations = 0 THEN
        RAISE NOTICE '✅ All violations fixed!';
    ELSE
        RAISE WARNING '⚠️  Some violations remain - manual review required';
    END IF;
END $$;

-- =============================================
-- Commit or Rollback
-- =============================================

-- Review the output above, then:
-- COMMIT;   -- Apply the fixes
-- ROLLBACK; -- Undo the fixes

-- For safety, we'll leave the transaction open
-- Run COMMIT; manually after reviewing
