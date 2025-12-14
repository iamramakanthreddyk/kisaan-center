-- Migration: Add Schema Constraints for Data Integrity
-- Date: 2025-10-27
-- Purpose: Prevent invalid data states and enforce business rules at database level

-- =============================================
-- 1. USER ROLE CONSTRAINTS
-- =============================================

-- Ensure role-shop_id consistency (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_role_shop_id'
  ) THEN
    ALTER TABLE kisaan_users 
      ADD CONSTRAINT chk_user_role_shop_id 
      CHECK (
        (role = 'owner' AND shop_id IS NULL) OR
        (role IN ('farmer', 'buyer') AND shop_id IS NOT NULL) OR
        (role IN ('superadmin', 'admin'))
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_balance_reasonable'
  ) THEN
    ALTER TABLE kisaan_users 
      ADD CONSTRAINT chk_user_balance_reasonable 
      CHECK (balance BETWEEN -10000000 AND 10000000);
  END IF;
END$$;

-- Comments (safe to run multiple times)
COMMENT ON CONSTRAINT chk_user_role_shop_id ON kisaan_users IS 
  'Business rule: Owners have no shop (they create them), Farmers/Buyers must belong to a shop';
COMMENT ON CONSTRAINT chk_user_balance_reasonable ON kisaan_users IS 
  'Prevents extreme balance values that indicate data corruption';

-- =============================================
-- 2. PLAN USAGE CONSTRAINTS
-- =============================================


-- Only one active plan per shop at a time (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_active_plan_unique
  ON kisaan_plan_usage(shop_id) 
  WHERE is_active = true;
COMMENT ON INDEX idx_shop_active_plan_unique IS 
  'Business rule: A shop can only have one active plan at a time';

-- =============================================
-- 3. TRANSACTION AMOUNT CONSTRAINTS
-- =============================================


-- All amounts must be non-negative (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transaction_amounts_positive'
  ) THEN
    ALTER TABLE kisaan_transactions 
      ADD CONSTRAINT chk_transaction_amounts_positive 
      CHECK (
        total_amount >= 0 AND 
        commission_amount >= 0 AND 
        farmer_earning >= 0
      );
  END IF;
END$$;

-- Transaction amount invariant: total = commission + farmer_earning (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transaction_amounts_sum'
  ) THEN
    ALTER TABLE kisaan_transactions 
      ADD CONSTRAINT chk_transaction_amounts_sum 
      CHECK (
        ABS(total_amount - (commission_amount + farmer_earning)) < 0.01
      );
  END IF;
END$$;
COMMENT ON CONSTRAINT chk_transaction_amounts_sum ON kisaan_transactions IS 
  'Critical invariant: total_amount must equal commission_amount + farmer_earning (within 0.01 tolerance)';

-- =============================================
-- 4. PAYMENT CONSTRAINTS
-- =============================================


-- Payment amount must be positive (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount_positive'
  ) THEN
    ALTER TABLE kisaan_payments 
      ADD CONSTRAINT chk_payment_amount_positive 
      CHECK (amount > 0);
  END IF;
END$$;
COMMENT ON CONSTRAINT chk_payment_amount_positive ON kisaan_payments IS 
  'Payments must have positive amounts (use negative transactions for refunds)';

-- =============================================
-- 5. EXPENSE CONSTRAINTS
-- =============================================


-- Expense amount must be positive (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_expense_amount_positive'
  ) THEN
    ALTER TABLE kisaan_expenses 
      ADD CONSTRAINT chk_expense_amount_positive 
      CHECK (amount > 0);
  END IF;
END$$;

-- If total_amount is set, it must equal amount (no drift) (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_expense_total_equals_amount'
  ) THEN
    ALTER TABLE kisaan_expenses 
      ADD CONSTRAINT chk_expense_total_equals_amount 
      CHECK (total_amount IS NULL OR ABS(total_amount - amount) < 0.01);
  END IF;
END$$;
COMMENT ON CONSTRAINT chk_expense_total_equals_amount ON kisaan_expenses IS 
  'If total_amount is tracked separately, it must match amount field';

-- =============================================
-- 6. ALLOCATION CONSTRAINTS
-- =============================================


-- Payment allocation amount must be positive (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_allocation_amount_positive'
  ) THEN
    ALTER TABLE payment_allocations 
      ADD CONSTRAINT chk_allocation_amount_positive 
      CHECK (allocated_amount > 0);
  END IF;
END$$;

-- Expense settlement amount must be positive (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_settlement_amount_positive'
  ) THEN
    ALTER TABLE expense_settlements 
      ADD CONSTRAINT chk_settlement_amount_positive 
      CHECK (amount > 0);
  END IF;
END$$;

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Check if any existing data violates new constraints
DO $$
DECLARE
  v_violations INT;
BEGIN
  -- Check user role violations
  SELECT COUNT(*) INTO v_violations
  FROM kisaan_users
  WHERE (role = 'owner' AND shop_id IS NOT NULL)
     OR (role IN ('farmer', 'buyer') AND shop_id IS NULL);
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % users with invalid role-shop_id combinations', v_violations;
  END IF;

  -- Check transaction amount violations
  SELECT COUNT(*) INTO v_violations
  FROM kisaan_transactions
  WHERE ABS(total_amount - (commission_amount + farmer_earning)) >= 0.01;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % transactions where total != commission + farmer_earning', v_violations;
  END IF;

  -- Check negative amounts
  SELECT COUNT(*) INTO v_violations
  FROM kisaan_transactions
  WHERE total_amount < 0 OR commission_amount < 0 OR farmer_earning < 0;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % transactions with negative amounts', v_violations;
  END IF;

  -- Check payment amounts
  SELECT COUNT(*) INTO v_violations
  FROM kisaan_payments
  WHERE amount <= 0;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % payments with non-positive amounts', v_violations;
  END IF;

  RAISE NOTICE 'Constraint validation complete. Check warnings above for any violations.';
END $$;

-- =============================================
-- ROLLBACK SCRIPT (commented out, use if needed)
-- =============================================

/*
-- To rollback this migration:
ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS chk_user_role_shop_id;
ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS chk_user_balance_reasonable;
ALTER TABLE kisaan_transactions DROP CONSTRAINT IF EXISTS chk_transaction_amounts_positive;
ALTER TABLE kisaan_transactions DROP CONSTRAINT IF EXISTS chk_transaction_amounts_sum;
ALTER TABLE kisaan_payments DROP CONSTRAINT IF EXISTS chk_payment_amount_positive;
ALTER TABLE kisaan_expenses DROP CONSTRAINT IF EXISTS chk_expense_amount_positive;
ALTER TABLE kisaan_expenses DROP CONSTRAINT IF EXISTS chk_expense_total_equals_amount;
ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS chk_allocation_amount_positive;
ALTER TABLE expense_settlements DROP CONSTRAINT IF EXISTS chk_settlement_amount_positive;
DROP INDEX IF EXISTS idx_shop_active_plan_unique;
*/
