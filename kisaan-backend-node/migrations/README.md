# Database Cleanup Migrations

## Overview

This directory contains database migrations to fix data quality issues and establish a foundation for the payment system refactor.

## Migrations

### 1. Schema Constraints (20251027_01)
**File:** `20251027_01_add_schema_constraints.sql`

Adds CHECK constraints to prevent invalid data:
- User role-shop_id consistency (owners must not have shop, farmers/buyers must)
- Transaction amount invariant (total = commission + farmer_earning)
- Positive amounts for payments, expenses, allocations
- Reasonable balance ranges

**Impact:** Prevents future data corruption at database level

### 2. Computed Views (20251027_02)
**File:** `20251027_02_create_computed_views.sql`

Creates views that compute status from source data:
- `v_transaction_settlement_status` - Settlement status from allocations
- `v_expense_settlement_status` - Expense status from settlements
- `v_user_balance_validation` - Compare stored vs computed balances
- `detect_balance_drift()` - Helper function to find drift

**Impact:** Single source of truth for settlement status, enables validation

### 3. Data Fixes (20251027_03)
**File:** `20251027_03_fix_data_quality.sql`

Repairs existing data violations:
- Fixes owner shop_id assignments
- Recalculates transaction amounts
- Marks invalid payments/expenses as failed/cancelled
- Syncs redundant fields
- Resets unreasonable balances

**Impact:** Cleans existing data to pass new constraints

## Execution Order

**IMPORTANT:** Run in this exact order!

### Step 1: Backup (CRITICAL!)
```bash
# Backup entire database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or backup specific tables
psql $DATABASE_URL -c "
CREATE TABLE kisaan_users_backup AS SELECT * FROM kisaan_users;
CREATE TABLE kisaan_transactions_backup AS SELECT * FROM kisaan_transactions;
CREATE TABLE kisaan_payments_backup AS SELECT * FROM kisaan_payments;
CREATE TABLE kisaan_expenses_backup AS SELECT * FROM kisaan_expenses;
"
```

### Step 2: Run Automated Cleanup Script

**Windows (PowerShell):**
```powershell
# Set database connection
$env:DATABASE_URL = "postgresql://user:pass@host:port/dbname"

# Run cleanup
.\scripts\db-cleanup.ps1
```

**Linux/Mac:**
```bash
# Set database connection
export DATABASE_URL="postgresql://user:pass@host:port/dbname"

# Make executable
chmod +x scripts/db-cleanup.sh

# Run cleanup
./scripts/db-cleanup.sh
```

### Step 3: Review Validation Report

The script will output:
- Total users checked
- Users with balance drift (stored != computed)
- Transaction settlement status distribution
- Expense settlement status distribution

**Example output:**
```
📊 Running balance drift detection...
 total_users | users_with_drift | avg_drift | max_drift
-------------+------------------+-----------+-----------
         150 |               23 |      5.43 |     45.20

⚠️  23 users have balance drift > 0.01
```

### Step 4: Fix Data Issues (if needed)

If violations found, run the data fix script:

```bash
# REVIEW the script first!
cat kisaan-backend-node/migrations/20251027_03_fix_data_quality.sql

# Run in transaction (doesn't auto-commit)
psql $DATABASE_URL -f kisaan-backend-node/migrations/20251027_03_fix_data_quality.sql

# Review the output, then manually:
psql $DATABASE_URL -c "COMMIT;"   # Apply fixes
# OR
psql $DATABASE_URL -c "ROLLBACK;" # Undo fixes
```

### Step 5: Re-validate

Run the cleanup script again to verify all issues fixed:
```bash
./scripts/db-cleanup.sh  # or .ps1 on Windows
```

Should show: `✅ All violations fixed!`

## Validation Queries

### Check Balance Drift
```sql
-- All users with drift
SELECT * FROM detect_balance_drift();

-- Specific user
SELECT * FROM v_user_balance_validation WHERE user_id = 123;
```

### Check Transaction Status
```sql
-- Transactions with status mismatch
SELECT 
    t.id,
    t.settlement_status AS stored,
    v.computed_settlement_status AS computed
FROM kisaan_transactions t
JOIN v_transaction_settlement_status v ON v.transaction_id = t.id
WHERE t.settlement_status != v.computed_settlement_status;
```

### Check Expense Status
```sql
-- Expenses with status mismatch
SELECT 
    e.id,
    e.status AS stored,
    v.computed_status AS computed
FROM kisaan_expenses e
JOIN v_expense_settlement_status v ON v.expense_id = e.id
WHERE e.status != v.computed_status;
```

## Rollback

If you need to undo these changes:

```sql
-- Remove constraints
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

-- Remove views
DROP VIEW IF EXISTS v_user_balance_validation;
DROP VIEW IF EXISTS v_expense_settlement_status;
DROP VIEW IF EXISTS v_transaction_settlement_status;
DROP FUNCTION IF EXISTS detect_balance_drift();

-- Restore data (if backed up)
TRUNCATE kisaan_users CASCADE;
INSERT INTO kisaan_users SELECT * FROM kisaan_users_backup;
-- Repeat for other tables...
```

## Common Issues & Solutions

### Issue: Constraint violation on existing data
**Solution:** Run `20251027_03_fix_data_quality.sql` first

### Issue: "Column does not exist" error
**Solution:** Ensure unified-schema.sql has been applied first

### Issue: Views reference missing columns
**Solution:** Check that payment_allocations and expense_settlements tables exist

### Issue: Balance drift not resolving
**Solution:** May need to implement BalanceCalculationService and re-sync balances

## Next Steps

After successful cleanup:

1. ✅ Database constraints enforced
2. ✅ Validation views created
3. ✅ Data quality issues fixed
4. 🔄 Implement BalanceCalculationService (Part 2)
5. 🔄 Enable shadow mode validation
6. 🔄 Refactor transaction creation flow (Part 3)

## Support

If you encounter issues:
1. Check the migration output for specific errors
2. Review validation queries above
3. Check existing data with: `SELECT * FROM detect_balance_drift();`
4. Consult PAYMENT_SYSTEM_COMPREHENSIVE_ANALYSIS.md for full context

## Files

- `20251027_01_add_schema_constraints.sql` - Constraints
- `20251027_02_create_computed_views.sql` - Views and functions
- `20251027_03_fix_data_quality.sql` - Data repairs
- `../../scripts/db-cleanup.sh` - Linux/Mac automation
- `../../scripts/db-cleanup.ps1` - Windows automation
