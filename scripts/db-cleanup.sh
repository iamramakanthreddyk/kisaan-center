#!/bin/bash
# Database Cleanup and Validation Script
# Purpose: Apply constraints and views, then validate data quality

set -e  # Exit on error

echo "=================================="
echo "Database Cleanup Script"
echo "Date: $(date)"
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "   Please set it first: export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    exit 1
fi

echo "✓ Database URL configured"
echo ""

# Function to run SQL file
run_migration() {
    local file=$1
    local name=$2
    
    echo "📋 Running: $name"
    echo "   File: $file"
    
    if psql "$DATABASE_URL" -f "$file" > /tmp/migration_output.log 2>&1; then
        echo "   ✅ Success"
        
        # Show warnings if any
        if grep -q "WARNING" /tmp/migration_output.log; then
            echo "   ⚠️  Warnings found:"
            grep "WARNING" /tmp/migration_output.log | sed 's/^/      /'
        fi
        
        # Show notices if any
        if grep -q "NOTICE" /tmp/migration_output.log; then
            echo "   ℹ️  Notices:"
            grep "NOTICE" /tmp/migration_output.log | sed 's/^/      /'
        fi
    else
        echo "   ❌ FAILED"
        echo "   Error details:"
        cat /tmp/migration_output.log | sed 's/^/      /'
        exit 1
    fi
    echo ""
}

# Step 1: Apply constraints
echo "=== STEP 1: Apply Schema Constraints ==="
run_migration \
    "kisaan-backend-node/migrations/20251027_01_add_schema_constraints.sql" \
    "Schema Constraints"

# Step 2: Create computed views
echo "=== STEP 2: Create Computed Views ==="
run_migration \
    "kisaan-backend-node/migrations/20251027_02_create_computed_views.sql" \
    "Computed Views"

# Step 3: Validate data quality
echo "=== STEP 3: Data Quality Validation ==="
echo ""

echo "📊 Running balance drift detection..."
psql "$DATABASE_URL" -c "
SELECT 
    COUNT(*) AS total_users,
    COUNT(CASE WHEN ABS(balance_drift) > 0.01 THEN 1 END) AS users_with_drift,
    ROUND(AVG(ABS(balance_drift))::NUMERIC, 2) AS avg_drift,
    ROUND(MAX(ABS(balance_drift))::NUMERIC, 2) AS max_drift
FROM v_user_balance_validation;
" -t

echo ""
echo "📊 Top 10 users with largest balance drift:"
psql "$DATABASE_URL" -c "
SELECT 
    username,
    role,
    stored_balance,
    computed_balance,
    balance_drift,
    CASE 
        WHEN stored_balance != 0 
        THEN ROUND((ABS(balance_drift) / ABS(stored_balance) * 100)::NUMERIC, 2)
        ELSE 0 
    END AS drift_percent
FROM v_user_balance_validation
WHERE ABS(balance_drift) > 0.01
ORDER BY ABS(balance_drift) DESC
LIMIT 10;
"

echo ""
echo "📊 Transaction settlement status check:"
psql "$DATABASE_URL" -c "
SELECT 
    computed_settlement_status AS status,
    COUNT(*) AS count,
    ROUND(AVG(buyer_pending_amount)::NUMERIC, 2) AS avg_buyer_pending,
    ROUND(AVG(farmer_pending_amount)::NUMERIC, 2) AS avg_farmer_pending
FROM v_transaction_settlement_status
GROUP BY computed_settlement_status
ORDER BY 
    CASE computed_settlement_status
        WHEN 'UNSETTLED' THEN 1
        WHEN 'PARTIALLY_SETTLED' THEN 2
        WHEN 'FULLY_SETTLED' THEN 3
    END;
"

echo ""
echo "📊 Expense settlement status check:"
psql "$DATABASE_URL" -c "
SELECT 
    computed_status AS status,
    COUNT(*) AS count,
    ROUND(SUM(total_amount)::NUMERIC, 2) AS total_amount,
    ROUND(SUM(settled_amount)::NUMERIC, 2) AS total_settled,
    ROUND(SUM(remaining_amount)::NUMERIC, 2) AS total_remaining
FROM v_expense_settlement_status
GROUP BY computed_status
ORDER BY 
    CASE computed_status
        WHEN 'PENDING' THEN 1
        WHEN 'PARTIALLY_SETTLED' THEN 2
        WHEN 'SETTLED' THEN 3
    END;
"

echo ""
echo "=================================="
echo "✅ Database cleanup complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Review warnings/notices above"
echo "2. Fix any data quality issues found"
echo "3. Run: npm run validate-balances (once service is implemented)"
echo "4. Enable shadow mode: export NEW_BALANCE_ENGINE_SHADOW=true"
echo ""
