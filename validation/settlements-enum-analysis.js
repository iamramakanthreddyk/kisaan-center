#!/usr/bin/env node

/**
 * SETTLEMENTS ENUM ANALYSIS
 * Check the actual enum values in the database vs code expectations
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

async function analyzeSettlementsEnums() {
  console.log('🔍 ANALYZING SETTLEMENTS ENUM VALUES\n');

  try {
    // Check settlement reason enum values
    console.log('📋 SETTLEMENT REASON ENUM VALUES (Database):');
    const reasonEnum = await pool.query(`
      SELECT enumtypid::regtype AS enum_type, enumlabel AS value
      FROM pg_enum
      WHERE enumtypid = 'enum_kisaan_settlements_reason'::regtype
      ORDER BY enumsortorder;
    `);

    if (reasonEnum.rows.length === 0) {
      console.log('   ❌ enum_kisaan_settlements_reason does not exist');
    } else {
      reasonEnum.rows.forEach(row => {
        console.log(`   ${row.value}`);
      });
    }

    // Check settlement status enum values
    console.log('\n📋 SETTLEMENT STATUS ENUM VALUES (Database):');
    const statusEnum = await pool.query(`
      SELECT enumtypid::regtype AS enum_type, enumlabel AS value
      FROM pg_enum
      WHERE enumtypid = 'enum_kisaan_settlements_status'::regtype
      ORDER BY enumsortorder;
    `);

    if (statusEnum.rows.length === 0) {
      console.log('   ❌ enum_kisaan_settlements_status does not exist');
    } else {
      statusEnum.rows.forEach(row => {
        console.log(`   ${row.value}`);
      });
    }

    // Compare with code expectations
    console.log('\n📋 CODE EXPECTATIONS (from settlement.ts):');
    console.log('SettlementReason enum:');
    console.log('   overpayment');
    console.log('   underpayment');
    console.log('   adjustment');
    console.log('   expense');
    console.log('   advance');

    console.log('\nSettlementStatus enum:');
    console.log('   pending');
    console.log('   settled');

    // Check if expense settlements exist despite enum mismatch
    console.log('\n🔍 CHECKING FOR EXPENSE SETTLEMENTS:');
    const expenseCheck = await pool.query(`
      SELECT COUNT(*) as expense_count
      FROM kisaan_settlements
      WHERE reason = 'expense';
    `);

    console.log(`   Records with reason='expense': ${expenseCheck.rows[0].expense_count}`);

    // Check actual reason values in table
    const actualReasons = await pool.query(`
      SELECT DISTINCT reason, COUNT(*) as count
      FROM kisaan_settlements
      GROUP BY reason
      ORDER BY reason;
    `);

    if (actualReasons.rows.length > 0) {
      console.log('\n📊 ACTUAL REASON VALUES IN TABLE:');
      actualReasons.rows.forEach(row => {
        console.log(`   ${row.reason}: ${row.count} records`);
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing settlements enums:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeSettlementsEnums();