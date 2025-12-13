#!/usr/bin/env node

/**
 * PAYMENT SYSTEM ANALYSIS & SIMPLIFICATION STRATEGY
 * Analyze current payment/balance system and propose better architecture
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

async function analyzeCurrentPaymentSystem() {
  console.log('💰 ANALYZING CURRENT PAYMENT SYSTEM\n');

  try {
    // Analyze current tables and their relationships
    console.log('📊 CURRENT TABLES ANALYSIS:\n');

    // Transactions
    const txStats = await pool.query(`
      SELECT COUNT(*) as count, SUM(total_amount::numeric) as total_value
      FROM kisaan_transactions;
    `);
    console.log(`📋 Transactions: ${txStats.rows[0].count} records, ₹${txStats.rows[0].total_value || 0}`);

    // Payments
    const paymentStats = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN transaction_id IS NOT NULL THEN 1 END) as linked_to_tx,
        COUNT(CASE WHEN transaction_id IS NULL THEN 1 END) as standalone,
        SUM(amount::numeric) as total_amount
      FROM kisaan_payments;
    `);
    const p = paymentStats.rows[0];
    console.log(`💵 Payments: ${p.total_payments} total (${p.linked_to_tx} transaction-linked, ${p.standalone} standalone), ₹${p.total_amount || 0}`);

    // Settlements
    const settlementStats = await pool.query(`
      SELECT COUNT(*) as count, SUM(amount::numeric) as total_value
      FROM kisaan_settlements;
    `);
    console.log(`⚖️ Settlements: ${settlementStats.rows[0].count} records, ₹${settlementStats.rows[0].total_value || 0}`);

    // User balances
    const balanceStats = await pool.query(`
      SELECT
        COUNT(CASE WHEN balance::numeric > 0 THEN 1 END) as positive_balances,
        COUNT(CASE WHEN balance::numeric < 0 THEN 1 END) as negative_balances,
        SUM(ABS(balance::numeric)) as total_balance_amount
      FROM kisaan_users
      WHERE balance IS NOT NULL AND balance::numeric != 0;
    `);
    const b = balanceStats.rows[0];
    console.log(`🏦 User Balances: ${b.positive_balances} positive, ${b.negative_balances} negative, ₹${b.total_balance_amount || 0} total`);

    console.log('\n🔄 CURRENT PAYMENT FLOW:\n');
    console.log('1. Transaction created → Farmer +balance, Buyer -balance');
    console.log('2. Payment made → Reduces user balance toward zero');
    console.log('3. Settlement created → For expenses/advances/adjustments');
    console.log('4. Balance updated → Running total maintained');

    console.log('\n❓ IDENTIFIED PROBLEMS:\n');
    console.log('• Too many tables for similar concepts (payments vs settlements)');
    console.log('• Complex enum mismatches in settlements');
    console.log('• Confusing distinction between transaction payments vs standalone payments');
    console.log('• Settlements table not working due to enum issues');
    console.log('• Complex balance calculation logic');

  } catch (error) {
    console.error('❌ Error analyzing payment system:', error.message);
  } finally {
    await pool.end();
  }
}

async function proposeSimplifiedPaymentStrategy() {
  console.log('\n🎯 PROPOSED SIMPLIFIED PAYMENT STRATEGY\n');

  console.log('🏗️ NEW ARCHITECTURE:\n');

  console.log('📋 CORE TABLES (Keep):');
  console.log('• kisaan_transactions - Main business transactions');
  console.log('• kisaan_users - With balance column');
  console.log('• kisaan_shops - Shop information');

  console.log('\n💰 UNIFIED PAYMENT SYSTEM:');
  console.log('• Single kisaan_payments table with payment_type categories');
  console.log('• Replace settlements with simple kisaan_expenses table');

  console.log('\n📊 PROPOSED TABLES:\n');

  console.log('1. Enhanced kisaan_payments:');
  console.log('   - id, transaction_id (nullable), user_id, shop_id');
  console.log('   - amount, payment_method, status, payment_date');
  console.log('   - payment_type: "TRANSACTION_PAYMENT", "STANDALONE_PAYMENT", "EXPENSE_RECOVERY", "ADVANCE_RECOVERY"');
  console.log('   - description, reference_id (links to expense if recovery)');

  console.log('\n2. New kisaan_expenses:');
  console.log('   - id, shop_id, paid_to_user_id, paid_by_user_id');
  console.log('   - amount, expense_type: "OWNER_EXPENSE", "FARMER_ADVANCE", "SHOP_EXPENSE"');
  console.log('   - description, expense_date, status: "PENDING", "RECOVERED", "WRITTEN_OFF"');
  console.log('   - recovery_payment_id (nullable - links to payment that recovered this)');

  console.log('\n🔄 SIMPLIFIED BUSINESS FLOW:\n');

  console.log('🎯 TRANSACTION SCENARIOS:\n');

  console.log('1. IMMEDIATE PAYMENT (during transaction):');
  console.log('   • Create transaction → Update balances');
  console.log('   • Create payment (payment_type: "TRANSACTION_PAYMENT") → Reduce balance');
  console.log('   • Result: Clean, immediate settlement');

  console.log('\n2. PENDING PAYMENT (pay later):');
  console.log('   • Create transaction → Update balances (buyer owes money)');
  console.log('   • Later: Create payment (payment_type: "STANDALONE_PAYMENT") → Reduce balance');
  console.log('   • Result: Clear pending amount tracking');

  console.log('\n3. OWNER PAYS EXPENSE TO FARMER:');
  console.log('   • Create expense (expense_type: "OWNER_EXPENSE", paid_to_user_id: farmer_id)');
  console.log('   • Update farmer balance +amount (owner owes farmer)');
  console.log('   • Later deduct from transaction payment or recover separately');

  console.log('\n4. FARMER ADVANCE (expense that might be recovered):');
  console.log('   • Create expense (expense_type: "FARMER_ADVANCE", status: "PENDING")');
  console.log('   • Update farmer balance +amount');
  console.log('   • When recovering: Create payment (payment_type: "ADVANCE_RECOVERY")');
  console.log('   • Link payment to expense, update expense status to "RECOVERED"');

  console.log('\n💡 RECOVERY SCENARIOS:\n');

  console.log('• From Transaction Payment:');
  console.log('  - Farmer delivers goods, owner deducts advance from payment');
  console.log('  - Payment amount = transaction_amount - advance_recovery');
  console.log('  - Expense marked as recovered');

  console.log('\n• Separate Recovery Payment:');
  console.log('  - Farmer pays back advance separately');
  console.log('  - Create standalone payment (payment_type: "ADVANCE_RECOVERY")');
  console.log('  - Expense marked as recovered');

  console.log('\n📈 BENEFITS:\n');
  console.log('✅ Single payments table with clear categories');
  console.log('✅ Simple expenses table for advances/recoveries');
  console.log('✅ No complex settlements logic');
  console.log('✅ Clear audit trail for all money movements');
  console.log('✅ Easy balance calculations');
  console.log('✅ Flexible expense recovery options');

  console.log('\n🗑️ TABLES TO REMOVE:\n');
  console.log('❌ kisaan_settlements - Too complex, replace with expenses');
  console.log('❌ kisaan_payment_allocations - If exists, simplify');
  console.log('❌ kisaan_balance_snapshots - If just for history, can derive');

  console.log('\n⚡ IMPLEMENTATION STEPS:\n');
  console.log('1. Create new kisaan_expenses table');
  console.log('2. Add payment_type column to kisaan_payments');
  console.log('3. Migrate existing settlements data to expenses');
  console.log('4. Update application code to use new structure');
  console.log('5. Test all scenarios thoroughly');
  console.log('6. Remove old settlements table');
}

// MAIN EXECUTION
async function runPaymentSystemAnalysis() {
  console.log('🔍 PAYMENT SYSTEM ANALYSIS & SIMPLIFICATION STRATEGY');
  console.log('==================================================\n');

  await analyzeCurrentPaymentSystem();
  await proposeSimplifiedPaymentStrategy();

  console.log('\n🎯 RECOMMENDATION SUMMARY:\n');
  console.log('Replace complex settlements with simple expenses table');
  console.log('Use categorized payments instead of multiple payment types');
  console.log('Maintain clear audit trail while simplifying logic');
  console.log('Enable flexible expense recovery (during payments or separately)');
}

// Run the analysis
runPaymentSystemAnalysis();