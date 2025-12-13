#!/usr/bin/env node

/**
 * DATABASE INTEGRITY VALIDATION SCRIPT
 * Validates all database tables and relationships
 * Covers: Users, Shops, Products, Categories, Transactions, Payments, Allocations, Commissions
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false
});

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tables: [],
  relationships: []
};

function logResult(testName, success, details = '') {
  results.total++;
  if (success) {
    results.passed++;
    console.log(`✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

// TABLE EXISTENCE TESTS
async function testTableExistence() {
  console.log('\n📋 TESTING TABLE EXISTENCE');

  const requiredTables = [
    'kisaan_users',
    'kisaan_shops',
    'kisaan_products',
    'kisaan_categories',
    'kisaan_transactions',
    'kisaan_payments',
    'kisaan_payment_allocations',
    'kisaan_commissions',
    'kisaan_shop_products',
    'kisaan_shop_categories',
    'kisaan_audit_logs',
    'kisaan_transaction_ledger',
    'kisaan_balance_snapshots'
  ];

  for (const tableName of requiredTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [tableName]);

      const exists = result.rows[0].exists;
      logResult(`Table ${tableName} exists`, exists);

      if (exists) {
        results.tables.push(tableName);
      }
    } catch (error) {
      logResult(`Table ${tableName} exists`, false, error.message);
    }
  }
}

// COLUMN VALIDATION TESTS
async function testTableColumns() {
  console.log('\n📊 TESTING TABLE COLUMNS');

  const tableColumns = {
    'kisaan_users': ['id', 'username', 'password', 'role', 'balance', 'cumulative_value', 'shop_id'],
    'kisaan_shops': ['id', 'name', 'owner_id', 'commission_rate', 'address'],
    'kisaan_products': ['id', 'name', 'category_id', 'unit', 'created_at'],
    'kisaan_categories': ['id', 'name', 'created_at'],
    'kisaan_transactions': ['id', 'shop_id', 'farmer_id', 'buyer_id', 'total_amount', 'commission_amount', 'farmer_earning', 'status'],
    'kisaan_payments': ['id', 'transaction_id', 'amount', 'status', 'payment_date', 'payer_type', 'payee_type'],
    'kisaan_payment_allocations': ['id', 'payment_id', 'transaction_id', 'allocated_amount'],
    'kisaan_commissions': ['id', 'shop_id', 'rate', 'type', 'created_at', 'updated_at']
  };

  for (const [tableName, expectedColumns] of Object.entries(tableColumns)) {
    if (!results.tables.includes(tableName)) continue;

    try {
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2)
      `, [tableName, expectedColumns]);

      const foundColumns = result.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

      const hasAllColumns = missingColumns.length === 0;
      logResult(`Table ${tableName} has required columns`,
        hasAllColumns,
        hasAllColumns ? '' : `Missing: ${missingColumns.join(', ')}`);

    } catch (error) {
      logResult(`Table ${tableName} column check`, false, error.message);
    }
  }
}

// REFERENTIAL INTEGRITY TESTS
async function testReferentialIntegrity() {
  console.log('\n🔗 TESTING REFERENTIAL INTEGRITY');

  // Test transactions reference valid users
  if (results.tables.includes('kisaan_transactions') && results.tables.includes('kisaan_users')) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_farmers
        FROM kisaan_transactions t
        LEFT JOIN kisaan_users u ON t.farmer_id = u.id
        WHERE u.id IS NULL
      `);

      const invalidFarmers = parseInt(result.rows[0].invalid_farmers);
      logResult('Transaction farmer references valid', invalidFarmers === 0,
        invalidFarmers > 0 ? `${invalidFarmers} transactions reference invalid farmers` : '');

      const buyerResult = await pool.query(`
        SELECT COUNT(*) as invalid_buyers
        FROM kisaan_transactions t
        LEFT JOIN kisaan_users b ON t.buyer_id = b.id
        WHERE b.id IS NULL
      `);

      const invalidBuyers = parseInt(buyerResult.rows[0].invalid_buyers);
      logResult('Transaction buyer references valid', invalidBuyers === 0,
        invalidBuyers > 0 ? `${invalidBuyers} transactions reference invalid buyers` : '');

    } catch (error) {
      logResult('Transaction user references check', false, error.message);
    }
  }

  // Test transactions reference valid shops
  if (results.tables.includes('kisaan_transactions') && results.tables.includes('kisaan_shops')) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_shops
        FROM kisaan_transactions t
        LEFT JOIN kisaan_shops s ON t.shop_id = s.id
        WHERE s.id IS NULL
      `);

      const invalidShops = parseInt(result.rows[0].invalid_shops);
      logResult('Transaction shop references valid', invalidShops === 0,
        invalidShops > 0 ? `${invalidShops} transactions reference invalid shops` : '');

    } catch (error) {
      logResult('Transaction shop references check', false, error.message);
    }
  }

  // Test payments reference valid transactions
  if (results.tables.includes('kisaan_payments') && results.tables.includes('kisaan_transactions')) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_transactions
        FROM kisaan_payments p
        LEFT JOIN kisaan_transactions t ON p.transaction_id = t.id
        WHERE p.transaction_id IS NOT NULL AND t.id IS NULL
      `);

      const invalidTransactions = parseInt(result.rows[0].invalid_transactions);
      logResult('Payment transaction references valid', invalidTransactions === 0,
        invalidTransactions > 0 ? `${invalidTransactions} payments reference invalid transactions` : '');

    } catch (error) {
      logResult('Payment transaction references check', false, error.message);
    }
  }
}

// DATA CONSISTENCY TESTS
async function testDataConsistency() {
  console.log('\n🔄 TESTING DATA CONSISTENCY');

  // Test balance calculations - negative balances are valid for buyers (debt) and farmers (advances)
  if (results.tables.includes('kisaan_users')) {
    try {
      // Check for negative balances (valid for buyers who haven't paid and farmers who received advances)
      const negativeResult = await pool.query(`
        SELECT COUNT(*) as negative_balances
        FROM kisaan_users
        WHERE balance < 0 AND role NOT IN ('buyer', 'farmer')
      `);

      const negativeBalances = parseInt(negativeResult.rows[0].negative_balances);
      logResult('No invalid negative balances', negativeBalances === 0,
        negativeBalances > 0 ? `${negativeBalances} non-buyer/farmer users have negative balances` : '');

      // Log info about valid negative balances
      const validNegativeResult = await pool.query(`
        SELECT role, COUNT(*) as count
        FROM kisaan_users
        WHERE balance < 0 AND role IN ('buyer', 'farmer')
        GROUP BY role
      `);

      if (validNegativeResult.rows.length > 0) {
        console.log(`   ℹ️  Valid negative balances found:`);
        validNegativeResult.rows.forEach(row => {
          console.log(`      ${row.count} ${row.role}(s) with negative balance (valid business logic)`);
        });
      }

    } catch (error) {
      logResult('Balance consistency check', false, error.message);
    }
  }

  // Test transaction amount consistency
  if (results.tables.includes('kisaan_transactions')) {
    try {
      // Check that farmer_earning = total_amount - commission_amount
      const inconsistentResult = await pool.query(`
        SELECT COUNT(*) as inconsistent
        FROM kisaan_transactions
        WHERE ABS((total_amount - commission_amount) - farmer_earning) > 0.01
      `);

      const inconsistent = parseInt(inconsistentResult.rows[0].inconsistent);
      logResult('Transaction amount consistency', inconsistent === 0,
        inconsistent > 0 ? `${inconsistent} transactions have inconsistent amounts` : '');

    } catch (error) {
      logResult('Transaction amount consistency check', false, error.message);
    }
  }

  // Test payment allocation totals
  if (results.tables.includes('kisaan_payments') && results.tables.includes('kisaan_payment_allocations')) {
    try {
      // Check that allocated amounts don't exceed payment amounts
      const overAllocatedResult = await pool.query(`
        SELECT COUNT(*) as overallocated
        FROM (
          SELECT p.id, p.amount as payment_amount, COALESCE(SUM(pa.allocated_amount), 0) as total_allocated
          FROM kisaan_payments p
          LEFT JOIN kisaan_payment_allocations pa ON p.id = pa.payment_id
          GROUP BY p.id, p.amount
        ) allocations
        WHERE total_allocated > payment_amount + 0.01
      `);

      const overAllocated = parseInt(overAllocatedResult.rows[0].overallocated);
      logResult('Payment allocation totals valid', overAllocated === 0,
        overAllocated > 0 ? `${overAllocated} payments are over-allocated` : '');

    } catch (error) {
      logResult('Payment allocation consistency check', false, error.message);
    }
  }
}

// BUSINESS LOGIC VALIDATION
async function testBusinessLogic() {
  console.log('\n💼 TESTING BUSINESS LOGIC');

  // Test user roles are valid
  if (results.tables.includes('kisaan_users')) {
    try {
      const roleResult = await pool.query(`
        SELECT DISTINCT role
        FROM kisaan_users
        WHERE role NOT IN ('superadmin', 'owner', 'farmer', 'buyer')
      `);

      const invalidRoles = roleResult.rows.length;
      logResult('User roles are valid', invalidRoles === 0,
        invalidRoles > 0 ? `Found ${invalidRoles} users with invalid roles` : '');

    } catch (error) {
      logResult('User role validation', false, error.message);
    }
  }

  // Test transaction statuses are valid
  if (results.tables.includes('kisaan_transactions')) {
    try {
      const statusResult = await pool.query(`
        SELECT DISTINCT status
        FROM kisaan_transactions
        WHERE status IS NOT NULL
        AND status NOT IN ('pending', 'completed', 'cancelled', 'settled')
      `);

      const invalidStatuses = statusResult.rows.length;
      logResult('Transaction statuses are valid', invalidStatuses === 0,
        invalidStatuses > 0 ? `Found ${invalidStatuses} transactions with invalid statuses` : '');

    } catch (error) {
      logResult('Transaction status validation', false, error.message);
    }
  }

  // Test payment statuses are valid
  if (results.tables.includes('kisaan_payments')) {
    try {
      const statusResult = await pool.query(`
        SELECT DISTINCT status
        FROM kisaan_payments
        WHERE status NOT IN ('PENDING', 'PAID', 'FAILED')
      `);

      const invalidStatuses = statusResult.rows.length;
      logResult('Payment statuses are valid', invalidStatuses === 0,
        invalidStatuses > 0 ? `Found ${invalidStatuses} payments with invalid statuses` : '');

    } catch (error) {
      logResult('Payment status validation', false, error.message);
    }
  }
}

// PERFORMANCE AND INDEX TESTS
async function testIndexes() {
  console.log('\n⚡ TESTING INDEXES');

  const criticalIndexes = [
    { table: 'kisaan_transactions', column: 'shop_id' },
    { table: 'kisaan_transactions', column: 'farmer_id' },
    { table: 'kisaan_transactions', column: 'buyer_id' },
    { table: 'kisaan_payments', column: 'transaction_id' },
    { table: 'kisaan_users', column: 'username' },
    { table: 'kisaan_users', column: 'role' }
  ];

  for (const { table, column } of criticalIndexes) {
    if (!results.tables.includes(table)) continue;

    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = $1
          AND indexdef LIKE '%' || $2 || '%'
        )
      `, [table, column]);

      const hasIndex = result.rows[0].exists;
      logResult(`Index on ${table}.${column} exists`, hasIndex);

    } catch (error) {
      logResult(`Index check for ${table}.${column}`, false, error.message);
    }
  }
}

// MAIN EXECUTION
async function runDatabaseValidation() {
  console.log('🗄️ DATABASE INTEGRITY VALIDATION');
  console.log('================================');

  try {
    await testTableExistence();
    await testTableColumns();
    await testReferentialIntegrity();
    await testDataConsistency();
    await testBusinessLogic();
    await testIndexes();

    // Results Summary
    console.log('\n📊 DATABASE VALIDATION RESULTS');
    console.log('==============================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    console.log('\n📋 Tables Found:', results.tables.length);
    results.tables.forEach(table => console.log(`  - ${table}`));

    if (results.failed === 0) {
      console.log('\n🎉 ALL DATABASE INTEGRITY CHECKS PASSED!');
    } else {
      console.log(`\n⚠️ ${results.failed} database integrity issue(s) found. Please review.`);
    }

  } catch (error) {
    console.error('\n💥 Database validation script crashed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the validation
runDatabaseValidation();