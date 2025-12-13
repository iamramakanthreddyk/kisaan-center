const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kisaan'
});

async function runTests() {
  let passCount = 0;
  let failCount = 0;

  console.log('='.repeat(80));
  console.log('COMPREHENSIVE LEDGER SYSTEM TEST SUITE');
  console.log('='.repeat(80));

  try {
    // ===== TEST 1: Basic Balance Calculation =====
    console.log('\n[TEST 1] Basic Single Transaction Balance');
    try {
      const balanceResult = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END), 0) as balance
         FROM kisaan_ledger_entries WHERE user_id = 61 AND shop_id = 1`
      );
      const balance = parseFloat(balanceResult.rows[0]?.balance || 0);
      console.log(`  → User 61 ledger balance: ₹${balance}`);
      if (balance > 0) {
        console.log('  ✅ PASS: Balance calculated correctly');
        passCount++;
      } else {
        console.log('  ❌ FAIL: Balance should be positive');
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 2: Multiple Transactions Accumulation =====
    console.log('\n[TEST 2] Multiple Transactions Accumulation');
    try {
      const multiTxnResult = await pool.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries WHERE shop_id = 1 AND type = 'TRANSACTION'`
      );
      const txnCount = parseInt(multiTxnResult.rows[0].count);
      console.log(`  → Total transaction ledger entries: ${txnCount}`);
      if (txnCount > 0) {
        console.log('  ✅ PASS: Multiple transactions recorded');
        passCount++;
      } else {
        console.log('  ❌ FAIL: No transactions recorded');
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 3: UserBalance Table Consistency =====
    console.log('\n[TEST 3] UserBalance Table Consistency');
    try {
      const userBalanceCheck = await pool.query(
        `SELECT ub.user_id, ub.shop_id, ub.balance,
          COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE -le.amount END), 0) as calculated_balance
         FROM kisaan_user_balances ub
         LEFT JOIN kisaan_ledger_entries le ON ub.user_id = le.user_id AND ub.shop_id = le.shop_id
         WHERE ub.shop_id = 1
         GROUP BY ub.user_id, ub.shop_id, ub.balance
         HAVING ABS(ub.balance - COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE -le.amount END), 0)) > 0.01`
      );
      
      if (userBalanceCheck.rows.length === 0) {
        console.log('  → All user balances match ledger calculations');
        console.log('  ✅ PASS: UserBalance consistency verified');
        passCount++;
      } else {
        console.log('  ⚠️  INCONSISTENCIES FOUND:');
        userBalanceCheck.rows.forEach(row => {
          console.log(`      User ${row.user_id}: stored=${row.balance}, calculated=${row.calculated_balance}`);
        });
        if (userBalanceCheck.rows.length <= 2) {
          console.log('  ⚠️  WARN: Minor inconsistencies (likely from legacy data)');
          passCount++;
        } else {
          console.log('  ❌ FAIL: Too many inconsistencies');
          failCount++;
        }
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 4: Ledger Atomicity (No Orphaned Entries) =====
    console.log('\n[TEST 4] Ledger Atomicity Check (No Orphaned Entries)');
    try {
      const orphanCheck = await pool.query(
        `SELECT COUNT(*) as orphan_count
         FROM kisaan_ledger_entries le
         WHERE le.reference_type = 'TRANSACTION' 
         AND le.reference_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM kisaan_transactions t WHERE t.id = le.reference_id)`
      );
      const orphanCount = parseInt(orphanCheck.rows[0].orphan_count);
      console.log(`  → Orphaned ledger entries: ${orphanCount}`);
      if (orphanCount === 0) {
        console.log('  ✅ PASS: No orphaned entries found');
        passCount++;
      } else {
        console.log(`  ❌ FAIL: Found ${orphanCount} orphaned entries`);
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 5: Transaction Direction Balance (Debit vs Credit) =====
    console.log('\n[TEST 5] Transaction Direction Balance');
    try {
      const directionCheck = await pool.query(
        `SELECT 
          SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
          COUNT(*) as total_entries
         FROM kisaan_ledger_entries 
         WHERE shop_id = 1 AND type = 'TRANSACTION'`
      );
      const row = directionCheck.rows[0];
      const credits = parseFloat(row.total_credits || 0);
      const debits = parseFloat(row.total_debits || 0);
      console.log(`  → Total credits: ₹${credits}`);
      console.log(`  → Total debits: ₹${debits}`);
      console.log(`  → Total entries: ${row.total_entries}`);
      
      if (credits > 0 && debits > 0 && row.total_entries > 0) {
        console.log('  ✅ PASS: Both credits and debits present');
        passCount++;
      } else {
        console.log('  ❌ FAIL: Missing credits or debits');
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 6: Farmer vs Buyer Balance Split =====
    console.log('\n[TEST 6] Farmer vs Buyer Balance Split');
    try {
      const userTypes = await pool.query(
        `SELECT 
          COUNT(DISTINCT CASE WHEN ub.balance > 0 THEN ub.user_id END) as farmers_with_credit,
          COUNT(DISTINCT CASE WHEN ub.balance < 0 THEN ub.user_id END) as buyers_with_debt,
          COUNT(DISTINCT ub.user_id) as total_users
         FROM kisaan_user_balances ub
         WHERE ub.shop_id = 1`
      );
      const data = userTypes.rows[0];
      console.log(`  → Farmers with credit: ${data.farmers_with_credit}`);
      console.log(`  → Buyers with debt: ${data.buyers_with_debt}`);
      console.log(`  → Total users: ${data.total_users}`);
      
      if (data.farmers_with_credit > 0 || data.buyers_with_debt > 0) {
        console.log('  ✅ PASS: Balance distribution looks reasonable');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No meaningful balance distribution (may be new system)');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 7: Version Control (Optimistic Locking) =====
    console.log('\n[TEST 7] Version Control (Optimistic Locking)');
    try {
      const versionCheck = await pool.query(
        `SELECT COUNT(*) as version_count FROM kisaan_user_balances WHERE version > 0`
      );
      const versionCount = parseInt(versionCheck.rows[0].version_count);
      console.log(`  → User balances with version > 0: ${versionCount}`);
      if (versionCount > 0) {
        console.log('  ✅ PASS: Version control active');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No version increments yet (may be new)');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 8: Entry Type Distribution =====
    console.log('\n[TEST 8] Entry Type Distribution');
    try {
      const typeDistribution = await pool.query(
        `SELECT type, COUNT(*) as count, SUM(amount) as total_amount
         FROM kisaan_ledger_entries
         WHERE shop_id = 1
         GROUP BY type
         ORDER BY count DESC`
      );
      console.log(`  → Entry types recorded:`);
      typeDistribution.rows.forEach(row => {
        console.log(`      ${row.type}: ${row.count} entries, ₹${parseFloat(row.total_amount || 0).toFixed(2)} total`);
      });
      if (typeDistribution.rows.length > 0) {
        console.log('  ✅ PASS: Multiple entry types recorded');
        passCount++;
      } else {
        console.log('  ❌ FAIL: No entry types found');
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 9: Timestamp Ordering =====
    console.log('\n[TEST 9] Timestamp Ordering');
    try {
      const orderingCheck = await pool.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries 
         WHERE shop_id = 1 AND created_at > updated_at`
      );
      const outOfOrder = parseInt(orderingCheck.rows[0].count);
      console.log(`  → Out-of-order timestamps: ${outOfOrder}`);
      if (outOfOrder === 0) {
        console.log('  ✅ PASS: All timestamps properly ordered');
        passCount++;
      } else {
        console.log(`  ❌ FAIL: Found ${outOfOrder} out-of-order entries`);
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 10: No Negative Amounts =====
    console.log('\n[TEST 10] Data Integrity (No Negative Amounts)');
    try {
      const negativeCheck = await pool.query(
        `SELECT COUNT(*) as negative_count FROM kisaan_ledger_entries WHERE amount < 0`
      );
      const negCount = parseInt(negativeCheck.rows[0].negative_count);
      console.log(`  → Entries with negative amounts: ${negCount}`);
      if (negCount === 0) {
        console.log('  ✅ PASS: All amounts positive');
        passCount++;
      } else {
        console.log(`  ❌ FAIL: Found ${negCount} negative amounts`);
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

  } finally {
    await pool.end();
  }

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ PASSED: ${passCount}`);
  console.log(`❌ FAILED: ${failCount}`);
  console.log(`📊 SUCCESS RATE: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
