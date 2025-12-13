#!/usr/bin/env node

/**
 * SETTLEMENTS TABLE ANALYSIS
 * Check what the settlements table is used for
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

async function analyzeSettlementsTable() {
  console.log('🔍 ANALYZING SETTLEMENTS TABLE USAGE\n');

  try {
    // Check if settlements table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'kisaan_settlements'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Settlements table does not exist in database');
      return;
    }

    console.log('✅ Settlements table exists');

    // Get table structure
    console.log('\n📋 TABLE STRUCTURE:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'kisaan_settlements'
      ORDER BY ordinal_position;
    `);

    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });

    // Get sample data
    console.log('\n📊 SAMPLE DATA (last 5 records):');
    const sampleData = await pool.query(`
      SELECT id, shop_id, user_id, amount, reason, status, settlement_date, created_at
      FROM kisaan_settlements
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    if (sampleData.rows.length === 0) {
      console.log('   No settlement records found');
    } else {
      sampleData.rows.forEach(row => {
        console.log(`   ID ${row.id}: Shop ${row.shop_id}, User ${row.user_id}, ₹${row.amount}, ${row.reason}, ${row.status}`);
      });
    }

    // Get usage statistics
    console.log('\n📈 USAGE STATISTICS:');
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_count,
        SUM(CASE WHEN status = 'pending' THEN amount::numeric ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'settled' THEN amount::numeric ELSE 0 END) as settled_amount,
        COUNT(DISTINCT shop_id) as shops_count,
        COUNT(DISTINCT user_id) as users_count
      FROM kisaan_settlements;
    `);

    const stat = stats.rows[0];
    console.log(`   Total Records: ${stat.total_records}`);
    console.log(`   Pending Settlements: ${stat.pending_count} (₹${stat.pending_amount || 0})`);
    console.log(`   Settled Records: ${stat.settled_count} (₹${stat.settled_amount || 0})`);
    console.log(`   Shops Involved: ${stat.shops_count}`);
    console.log(`   Users Involved: ${stat.users_count}`);

    // Get reason breakdown
    console.log('\n📋 SETTLEMENT REASONS BREAKDOWN:');
    const reasons = await pool.query(`
      SELECT reason, COUNT(*) as count, SUM(amount::numeric) as total_amount
      FROM kisaan_settlements
      GROUP BY reason
      ORDER BY count DESC;
    `);

    reasons.rows.forEach(reason => {
      console.log(`   ${reason.reason}: ${reason.count} records (₹${reason.total_amount || 0})`);
    });

    // Check relationships
    console.log('\n🔗 RELATIONSHIPS:');
    const relationships = await pool.query(`
      SELECT
        COUNT(CASE WHEN transaction_id IS NOT NULL THEN 1 END) as linked_to_transactions,
        COUNT(CASE WHEN transaction_id IS NULL THEN 1 END) as standalone_settlements
      FROM kisaan_settlements;
    `);

    const rel = relationships.rows[0];
    console.log(`   Linked to Transactions: ${rel.linked_to_transactions}`);
    console.log(`   Standalone Settlements: ${rel.standalone_settlements}`);

    // Check how settlements are used in expenses
    console.log('\n💰 EXPENSE USAGE:');
    const expenseCheck = await pool.query(`
      SELECT reason, COUNT(*) as count
      FROM kisaan_settlements
      WHERE reason IN ('expense', 'adjustment')
      GROUP BY reason;
    `);

    if (expenseCheck.rows.length > 0) {
      expenseCheck.rows.forEach(row => {
        console.log(`   ${row.reason}: ${row.count} records`);
      });
    } else {
      console.log('   No expense-related settlements found');
    }

  } catch (error) {
    console.error('❌ Error analyzing settlements table:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeSettlementsTable();