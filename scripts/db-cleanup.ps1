# Database Cleanup and Validation Script (PowerShell)
# Purpose: Apply constraints and views, then validate data quality

$ErrorActionPreference = "Stop"

Write-Host "=================================="
Write-Host "Database Cleanup Script"
Write-Host "Date: $(Get-Date)"
Write-Host "=================================="
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "   Please set it first: `$env:DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    exit 1
}

Write-Host "✓ Database URL configured" -ForegroundColor Green
Write-Host ""

# Function to run SQL file
function Run-Migration {
    param(
        [string]$File,
        [string]$Name
    )
    
    Write-Host "📋 Running: $Name"
    Write-Host "   File: $File"
    
    try {
        $output = & psql $env:DATABASE_URL -f $File 2>&1
        Write-Host "   ✅ Success" -ForegroundColor Green
        
        # Show warnings
        $warnings = $output | Select-String "WARNING"
        if ($warnings) {
            Write-Host "   ⚠️  Warnings found:" -ForegroundColor Yellow
            $warnings | ForEach-Object { Write-Host "      $_" }
        }
        
        # Show notices
        $notices = $output | Select-String "NOTICE"
        if ($notices) {
            Write-Host "   ℹ️  Notices:" -ForegroundColor Cyan
            $notices | ForEach-Object { Write-Host "      $_" }
        }
    }
    catch {
        Write-Host "   ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Step 1: Apply constraints
Write-Host "=== STEP 1: Apply Schema Constraints ===" -ForegroundColor Cyan
Run-Migration `
    -File "kisaan-backend-node\migrations\20251027_01_add_schema_constraints.sql" `
    -Name "Schema Constraints"

# Step 2: Create computed views
Write-Host "=== STEP 2: Create Computed Views ===" -ForegroundColor Cyan
Run-Migration `
    -File "kisaan-backend-node\migrations\20251027_02_create_computed_views.sql" `
    -Name "Computed Views"

# Step 3: Validate data quality
Write-Host "=== STEP 3: Data Quality Validation ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running balance drift detection..."
$query1 = "SELECT COUNT(*) AS total_users, COUNT(CASE WHEN ABS(balance_drift) > 0.01 THEN 1 END) AS users_with_drift FROM v_user_balance_validation;"
& psql $env:DATABASE_URL -c $query1 -t

Write-Host ""
Write-Host "Top 10 users with largest balance drift:"
$query2 = "SELECT username, role, stored_balance, computed_balance, balance_drift FROM v_user_balance_validation WHERE ABS(balance_drift) > 0.01 ORDER BY ABS(balance_drift) DESC LIMIT 10;"
& psql $env:DATABASE_URL -c $query2

Write-Host ""
Write-Host "Transaction settlement status check:"
$query3 = "SELECT computed_settlement_status AS status, COUNT(*) AS count FROM v_transaction_settlement_status GROUP BY computed_settlement_status ORDER BY CASE computed_settlement_status WHEN 'UNSETTLED' THEN 1 WHEN 'PARTIALLY_SETTLED' THEN 2 WHEN 'FULLY_SETTLED' THEN 3 END;"
& psql $env:DATABASE_URL -c $query3

Write-Host ""
Write-Host "Expense settlement status check:"
$query4 = "SELECT computed_status AS status, COUNT(*) AS count FROM v_expense_settlement_status GROUP BY computed_status ORDER BY CASE computed_status WHEN 'PENDING' THEN 1 WHEN 'PARTIALLY_SETTLED' THEN 2 WHEN 'SETTLED' THEN 3 END;"
& psql $env:DATABASE_URL -c $query4

Write-Host ""
Write-Host "=================================="
Write-Host "✅ Database cleanup complete!" -ForegroundColor Green
Write-Host "=================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review warnings/notices above"
Write-Host "2. Fix any data quality issues found"
Write-Host "3. Run: npm run validate-balances (once service is implemented)"
Write-Host "4. Enable shadow mode: Set NEW_BALANCE_ENGINE_SHADOW=true in .env"
Write-Host ""
