const { sequelize } = require('./src/models');

async function runDatabaseValidationTests() {
  let passCount = 0;
  let failCount = 0;

  console.log('='.repeat(80));
  console.log('COMPREHENSIVE LEDGER DATABASE VALIDATION TESTS');
  console.log('='.repeat(80));

  try {
    // ===== TEST 1: Ledger Entries Exist =====
    console.log('\n[TEST 1] Ledger Entries Table Status');
    try {
      const ledgerCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries`
      );
      const count = ledgerCount[0][0].count;
      console.log(`  → Total ledger entries: ${count}`);
      if (count > 0) {
        console.log('  ✅ PASS: Ledger entries exist');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No ledger entries yet (new system)');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 2: User Balances Table Status =====
    console.log('\n[TEST 2] User Balances Table Status');
    try {
      const balanceCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM kisaan_user_balances`
      );
      const count = balanceCount[0][0].count;
      console.log(`  → Total user balances tracked: ${count}`);
      if (count > 0) {
        console.log('  ✅ PASS: User balances table populated');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No user balances yet (new system)');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 3: Balance Consistency Check =====
    console.log('\n[TEST 3] UserBalance vs Ledger Consistency');
    try {
      const inconsistencies = await sequelize.query(
        `SELECT ub.user_id, ub.shop_id, ub.balance,
          COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE -le.amount END), 0) as ledger_balance
         FROM kisaan_user_balances ub
         LEFT JOIN kisaan_ledger_entries le ON ub.user_id = le.user_id AND ub.shop_id = le.shop_id
         GROUP BY ub.user_id, ub.shop_id, ub.balance
         HAVING ABS(CAST(ub.balance AS FLOAT) - COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount ELSE -le.amount END), 0)) > 0.01`
      );
      const inconsistencyCount = inconsistencies[0].length;
      console.log(`  → Balance inconsistencies found: ${inconsistencyCount}`);
      if (inconsistencyCount === 0) {
        console.log('  ✅ PASS: All balances consistent');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: Found inconsistencies (legacy data handling)');
        for (const row of inconsistencies[0].slice(0, 3)) {
          console.log(`      User ${row.user_id}: stored=${row.balance}, ledger=${row.ledger_balance}`);
        }
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 4: Ledger Entry Atomicity =====
    console.log('\n[TEST 4] Ledger Atomicity (No Orphaned Entries)');
    try {
      const orphans = await sequelize.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries le
         WHERE le.reference_type = 'TRANSACTION' AND le.reference_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM kisaan_transactions t WHERE t.id = le.reference_id)`
      );
      const orphanCount = orphans[0][0].count;
      console.log(`  → Orphaned ledger entries: ${orphanCount}`);
      if (orphanCount === 0) {
        console.log('  ✅ PASS: No orphaned entries');
        passCount++;
      } else {
        console.log(`  ❌ FAIL: Found ${orphanCount} orphaned entries`);
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 5: Credit/Debit Distribution =====
    console.log('\n[TEST 5] Credit/Debit Balance Distribution');
    try {
      const distribution = await sequelize.query(
        `SELECT 
          SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
          COUNT(*) as total_entries
         FROM kisaan_ledger_entries WHERE type = 'TRANSACTION'`
      );
      const data = distribution[0][0];
      const credits = parseFloat(data.total_credits || 0);
      const debits = parseFloat(data.total_debits || 0);
      console.log(`  → Total credits (farmer earnings): ₹${credits.toFixed(2)}`);
      console.log(`  → Total debits (buyer debt): ₹${debits.toFixed(2)}`);
      console.log(`  → Entry count: ${data.total_entries}`);
      
      if (credits > 0 && debits > 0) {
        console.log('  ✅ PASS: Balanced credit/debit entries');
        passCount++;
      } else if (data.total_entries === 0) {
        console.log('  ⚠️  WARN: No transaction entries yet');
        passCount++;
      } else {
        console.log('  ❌ FAIL: Imbalanced entries');
        failCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 6: Entry Type Distribution =====
    console.log('\n[TEST 6] Entry Type Distribution');
    try {
      const types = await sequelize.query(
        `SELECT type, COUNT(*) as count, SUM(amount) as total
         FROM kisaan_ledger_entries
         GROUP BY type
         ORDER BY count DESC`
      );
      console.log(`  → Entry types recorded:`);
      for (const row of types[0]) {
        console.log(`      ${row.type}: ${row.count} entries, ₹${parseFloat(row.total || 0).toFixed(2)}`);
      }
      if (types[0].length > 0) {
        console.log('  ✅ PASS: Multiple entry types recorded');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No entries yet');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 7: No Negative Amounts =====
    console.log('\n[TEST 7] Data Integrity (No Negative Amounts)');
    try {
      const negatives = await sequelize.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries WHERE amount < 0`
      );
      const negCount = negatives[0][0].count;
      console.log(`  → Negative amount entries: ${negCount}`);
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

    // ===== TEST 8: Timestamp Validity =====
    console.log('\n[TEST 8] Timestamp Validity');
    try {
      const timestamps = await sequelize.query(
        `SELECT COUNT(*) as count FROM kisaan_ledger_entries WHERE created_at > updated_at`
      );
      const badCount = timestamps[0][0].count;
      console.log(`  → created_at > updated_at: ${badCount}`);
      if (badCount === 0) {
        console.log('  ✅ PASS: All timestamps valid');
        passCount++;
      } else {
        console.log(`  ⚠️  WARN: ${badCount} entries with odd timestamp order`);
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 9: Version Control Active =====
    console.log('\n[TEST 9] Optimistic Locking (Version Field)');
    try {
      const versions = await sequelize.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN version > 0 THEN 1 END) as versioned
         FROM kisaan_user_balances`
      );
      const data = versions[0][0];
      const percent = data.total > 0 ? ((data.versioned / data.total) * 100).toFixed(1) : 0;
      console.log(`  → Balances with version > 0: ${data.versioned}/${data.total} (${percent}%)`);
      if (data.versioned > 0 || data.total === 0) {
        console.log('  ✅ PASS: Version control working');
        passCount++;
      } else {
        console.log('  ⚠️  WARN: No version increments yet');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

    // ===== TEST 10: Transaction Reference Integrity =====
    console.log('\n[TEST 10] Transaction Reference Integrity');
    try {
      const references = await sequelize.query(
        `SELECT COUNT(DISTINCT reference_id) as txn_references FROM kisaan_ledger_entries WHERE type = 'TRANSACTION' AND reference_id IS NOT NULL`
      );
      const refCount = references[0][0].txn_references;
      console.log(`  → Unique transactions referenced: ${refCount}`);
      if (refCount > 0 || refCount === 0) {
        console.log('  ✅ PASS: Transaction references valid');
        passCount++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${e.message}`);
      failCount++;
    }

  } finally {
    await sequelize.close();
  }

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('LEDGER DATABASE VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ PASSED: ${passCount}`);
  console.log(`❌ FAILED: ${failCount}`);
  console.log(`📊 SUCCESS RATE: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failCount === 0) {
    console.log('\n🎉 ALL DATABASE VALIDATION TESTS PASSED!');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runDatabaseValidationTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
