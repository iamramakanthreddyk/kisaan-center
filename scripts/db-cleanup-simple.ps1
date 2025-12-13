# Database Cleanup Script - PowerShell
# Run migrations and validate database

$ErrorActionPreference = "Stop"

Write-Host "=================================="
Write-Host "Database Cleanup Script"
Write-Host "=================================="
Write-Host ""

if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL not set" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL configured" -ForegroundColor Green
Write-Host ""

# Run migration
function Run-Migration {
    param([string]$File, [string]$Name)
    
    Write-Host "Running: $Name"
    try {
        & psql $env:DATABASE_URL -f $File
        Write-Host "  Success" -ForegroundColor Green
    }
    catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Step 1
Write-Host "=== STEP 1: Apply Constraints ===" -ForegroundColor Cyan
Run-Migration -File "kisaan-backend-node\migrations\20251027_01_add_schema_constraints.sql" -Name "Constraints"

# Step 2
Write-Host "=== STEP 2: Create Views ===" -ForegroundColor Cyan
Run-Migration -File "kisaan-backend-node\migrations\20251027_02_create_computed_views.sql" -Name "Views"

# Step 3
Write-Host "=== STEP 3: Validation ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Balance drift check..."
$q1 = "SELECT COUNT(*) AS users, COUNT(CASE WHEN ABS(balance_drift) > 0.01 THEN 1 END) AS with_drift FROM v_user_balance_validation;"
& psql $env:DATABASE_URL -c $q1

Write-Host ""
Write-Host "Top users with drift:"
$q2 = "SELECT username, role, balance_drift FROM v_user_balance_validation WHERE ABS(balance_drift) > 0.01 ORDER BY ABS(balance_drift) DESC LIMIT 5;"
& psql $env:DATABASE_URL -c $q2

Write-Host ""
Write-Host "Transaction status:"
$q3 = "SELECT computed_settlement_status, COUNT(*) FROM v_transaction_settlement_status GROUP BY computed_settlement_status;"
& psql $env:DATABASE_URL -c $q3

Write-Host ""
Write-Host "=================================="
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "=================================="
