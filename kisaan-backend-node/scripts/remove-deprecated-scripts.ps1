Param(
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

$Deprecated = @(
  'check-shop-categories.ts',
  'delete_category_safe.ts',
  'delete_category_safe.js',
  'fix-plan-price.ts',
  'fix-shop-categories.ts',
  'migrate_all.js',
  'seed_all.js',
  'setup-dev-database.ts'
)

Write-Host "Starting deprecated script cleanup..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir '..')
$targetsDir = Join-Path $root 'scripts'

if (-not (Test-Path $targetsDir)) {
  Write-Host "Scripts directory not found: $targetsDir" -ForegroundColor Yellow
  exit 0
}

$removed = @()
foreach ($name in $Deprecated) {
  $path = Join-Path $targetsDir $name
  if (Test-Path $path) {
    if ($WhatIf) {
      Write-Host "Would remove $name" -ForegroundColor DarkGray
    } else {
      Remove-Item -Force $path
      Write-Host "Removed $name" -ForegroundColor Green
    }
    $removed += $name
  } else {
    Write-Host "Missing (already removed): $name" -ForegroundColor DarkGray
  }
}

Write-Host "Cleanup complete. Removed $($removed.Count) files." -ForegroundColor Cyan
if ($WhatIf) { Write-Host "(WhatIf mode - no files actually deleted)" -ForegroundColor Yellow }