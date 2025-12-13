/**
 * Comprehensive Database Structure Test and Validation Script
 * Tests all database structures, validates schemas, adds purpose columns, and cleans/finalizes
 * Usage: npx ts-node scripts/db-structure-test.ts
 */

import { Client } from 'pg';
const dotenv = require('dotenv');
const path = require('path');

// Load environment
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: string[];
  constraints?: string[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  purpose?: string; // For documentation
}

// Expected schema based on unified-schema.sql
const EXPECTED_SCHEMA: TableDefinition[] = [
  {
    name: 'kisaan_plans',
    columns: [
      { name: 'id', type: 'integer', nullable: false, purpose: 'Primary key' },
      { name: 'name', type: 'character varying(100)', nullable: false, purpose: 'Plan name' },
      { name: 'description', type: 'text', nullable: true, purpose: 'Plan description' },
      { name: 'price', type: 'numeric(10,2)', nullable: true, purpose: 'Plan price' },
      { name: 'billing_cycle', type: 'enum_kisaan_plans_billing_cycle', nullable: false, default: "'monthly'::enum_kisaan_plans_billing_cycle", purpose: 'Billing frequency' },
      { name: 'monthly_price', type: 'numeric(10,2)', nullable: true, purpose: 'Monthly price' },
      { name: 'quarterly_price', type: 'numeric(10,2)', nullable: true, purpose: 'Quarterly price' },
      { name: 'yearly_price', type: 'numeric(10,2)', nullable: true, purpose: 'Yearly price' },
      { name: 'max_farmers', type: 'integer', nullable: true, purpose: 'Maximum farmers allowed' },
      { name: 'max_buyers', type: 'integer', nullable: true, purpose: 'Maximum buyers allowed' },
      { name: 'max_transactions', type: 'integer', nullable: true, purpose: 'Maximum transactions allowed' },
      { name: 'data_retention_months', type: 'integer', nullable: true, purpose: 'Data retention period' },
      { name: 'features', type: 'text', nullable: false, default: "''::text", purpose: 'Plan features JSON' },
      { name: 'is_active', type: 'boolean', nullable: false, default: 'true', purpose: 'Plan active status' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_plans_is_active', 'kisaan_plans_name_unique']
  },
  {
    name: 'kisaan_categories',
    columns: [
      { name: 'id', type: 'integer', nullable: false, purpose: 'Primary key' },
      { name: 'name', type: 'character varying(100)', nullable: false, purpose: 'Category name' },
      { name: 'description', type: 'text', nullable: true, purpose: 'Category description' },
      { name: 'status', type: 'character varying(255)', nullable: true, purpose: 'Category status' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ]
  },
  {
    name: 'kisaan_users',
    columns: [
      { name: 'id', type: 'bigint', nullable: false, purpose: 'Primary key' },
      { name: 'username', type: 'character varying(255)', nullable: false, purpose: 'Unique username' },
      { name: 'password', type: 'character varying(255)', nullable: false, purpose: 'Hashed password' },
      { name: 'role', type: 'enum_kisaan_users_role', nullable: false, purpose: 'User role' },
      { name: 'shop_id', type: 'bigint', nullable: true, purpose: 'Associated shop ID' },
      { name: 'contact', type: 'character varying(255)', nullable: true, purpose: 'Contact information' },
      { name: 'email', type: 'character varying(255)', nullable: true, purpose: 'Email address' },
      { name: 'firstname', type: 'character varying(255)', nullable: true, purpose: 'First name' },
      { name: 'status', type: 'enum_kisaan_users_status', nullable: false, default: "'active'::enum_kisaan_users_status", purpose: 'User status' },
      { name: 'balance', type: 'numeric(12,2)', nullable: false, default: '0.00', purpose: 'Current balance' },
      { name: 'cumulative_value', type: 'numeric(18,2)', nullable: false, default: '0.00', purpose: 'Total transaction value' },
      { name: 'created_by', type: 'bigint', nullable: true, purpose: 'User who created this record' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_users_username', 'kisaan_users_role', 'kisaan_users_shop_id', 'idx_kisaan_users_shopid_roles']
  },
  {
    name: 'kisaan_shops',
    columns: [
      { name: 'id', type: 'bigint', nullable: false, purpose: 'Primary key' },
      { name: 'name', type: 'character varying(255)', nullable: false, purpose: 'Shop name' },
      { name: 'owner_id', type: 'bigint', nullable: false, purpose: 'Shop owner user ID' },
      { name: 'plan_id', type: 'integer', nullable: true, purpose: 'Associated plan ID' },
      { name: 'address', type: 'text', nullable: true, purpose: 'Shop address' },
      { name: 'contact', type: 'character varying(255)', nullable: true, purpose: 'Contact information' },
      { name: 'status', type: 'enum_kisaan_shops_status', nullable: false, default: "'active'::enum_kisaan_shops_status", purpose: 'Shop status' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_shops_owner_id', 'kisaan_shops_plan_id', 'kisaan_shops_status']
  },
  {
    name: 'kisaan_products',
    columns: [
      { name: 'id', type: 'integer', nullable: false, purpose: 'Primary key' },
      { name: 'name', type: 'character varying(100)', nullable: false, purpose: 'Product name' },
      { name: 'category_id', type: 'integer', nullable: false, purpose: 'Product category ID' },
      { name: 'description', type: 'text', nullable: true, purpose: 'Product description' },
      { name: 'price', type: 'numeric(10,2)', nullable: true, purpose: 'Product price' },
      { name: 'record_status', type: 'character varying(255)', nullable: true, purpose: 'Record status' },
      { name: 'unit', type: 'character varying(20)', nullable: true, purpose: 'Unit of measurement' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_products_category_id', 'kisaan_products_name_category_unique']
  },
  {
    name: 'kisaan_transactions',
    columns: [
      { name: 'id', type: 'integer', nullable: false, purpose: 'Primary key' },
      { name: 'shop_id', type: 'bigint', nullable: false, purpose: 'Shop ID' },
      { name: 'farmer_id', type: 'bigint', nullable: false, purpose: 'Farmer user ID' },
      { name: 'buyer_id', type: 'bigint', nullable: false, purpose: 'Buyer user ID' },
      { name: 'category_id', type: 'integer', nullable: false, purpose: 'Product category ID' },
      { name: 'product_name', type: 'character varying(255)', nullable: false, purpose: 'Product name' },
      { name: 'quantity', type: 'numeric(12,2)', nullable: false, purpose: 'Transaction quantity' },
      { name: 'unit_price', type: 'numeric(12,2)', nullable: false, purpose: 'Unit price' },
      { name: 'total_sale_value', type: 'numeric(12,2)', nullable: false, purpose: 'Total sale value' },
      { name: 'shop_commission', type: 'numeric(12,2)', nullable: false, purpose: 'Shop commission amount' },
      { name: 'farmer_earning', type: 'numeric(12,2)', nullable: false, purpose: 'Farmer earning amount' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_transactions_shop_id', 'kisaan_transactions_farmer_id', 'kisaan_transactions_buyer_id', 'kisaan_transactions_category_id', 'kisaan_transactions_created_at']
  },
  {
    name: 'kisaan_payments',
    columns: [
      { name: 'id', type: 'bigint', nullable: false, purpose: 'Primary key' },
      { name: 'transaction_id', type: 'integer', nullable: false, purpose: 'Associated transaction ID' },
      { name: 'payer_type', type: 'enum_kisaan_payments_payer_type', nullable: false, purpose: 'Type of payer' },
      { name: 'payee_type', type: 'enum_kisaan_payments_payee_type', nullable: false, purpose: 'Type of payee' },
      { name: 'amount', type: 'numeric(12,2)', nullable: false, purpose: 'Payment amount' },
      { name: 'status', type: 'enum_kisaan_payments_status', nullable: false, default: "'PENDING'::enum_kisaan_payments_status", purpose: 'Payment status' },
      { name: 'payment_date', type: 'timestamp with time zone', nullable: true, purpose: 'Payment date' },
      { name: 'method', type: 'enum_kisaan_payments_method', nullable: false, purpose: 'Payment method' },
      { name: 'notes', type: 'text', nullable: true, purpose: 'Payment notes' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' },
      { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Update timestamp' }
    ],
    indexes: ['kisaan_payments_transaction_id', 'kisaan_payments_payer_type', 'kisaan_payments_payee_type', 'kisaan_payments_status', 'kisaan_payments_payment_date', 'kisaan_payments_transaction_status']
  },
  {
    name: 'kisaan_transaction_ledger',
    columns: [
      { name: 'id', type: 'bigint', nullable: false, purpose: 'Primary key' },
      { name: 'transaction_id', type: 'bigint', nullable: true, purpose: 'Associated transaction ID' },
      { name: 'user_id', type: 'bigint', nullable: false, purpose: 'User ID affected' },
      { name: 'role', type: 'character varying(20)', nullable: false, purpose: 'User role at time of transaction' },
      { name: 'delta_amount', type: 'numeric(12,2)', nullable: false, purpose: 'Balance change amount' },
      { name: 'balance_before', type: 'numeric(12,2)', nullable: true, purpose: 'Balance before change' },
      { name: 'balance_after', type: 'numeric(12,2)', nullable: true, purpose: 'Balance after change' },
      { name: 'reason_code', type: 'character varying(40)', nullable: false, purpose: 'Reason for balance change' },
      { name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'CURRENT_TIMESTAMP', purpose: 'Creation timestamp' }
    ],
    indexes: ['idx_kisaan_transaction_ledger_user_created', 'idx_kisaan_transaction_ledger_txn']
  },
  // Add other tables as needed...
];

class DatabaseStructureTester {
  private client: Client;
  private issues: string[] = [];
  private fixes: string[] = [];

  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'kisaan_dev',
      port: Number(process.env.DB_PORT || 5432),
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Connected to database');
  }

  async disconnect() {
    await this.client.end();
    console.log('✅ Disconnected from database');
  }

  async runTests() {
    console.log('🚀 Starting comprehensive database structure tests...\n');

    await this.testTablesExist();
    await this.testColumnsExist();
    await this.testIndexesExist();
    await this.testConstraintsExist();
    await this.testDataIntegrity();
    await this.addPurposeColumns();
    await this.cleanupAndFinalize();

    this.printResults();
  }

  private async testTablesExist() {
    console.log('📋 Testing table existence...');

    for (const table of EXPECTED_SCHEMA) {
      try {
        const result = await this.client.query(
          'SELECT to_regclass($1) as exists',
          [table.name]
        );

        if (!result.rows[0].exists) {
          this.issues.push(`MISSING TABLE: ${table.name}`);
          this.fixes.push(`CREATE TABLE IF NOT EXISTS ${table.name} (...); -- Add table definition`);
        } else {
          console.log(`  ✅ ${table.name}`);
        }
      } catch (error) {
        this.issues.push(`ERROR checking table ${table.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async testColumnsExist() {
    console.log('\n📊 Testing column existence and types...');

    for (const table of EXPECTED_SCHEMA) {
      try {
        const result = await this.client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table.name]);

        const existingColumns = new Map(
          result.rows.map(row => [row.column_name, row])
        );

        for (const expectedCol of table.columns) {
          const existing = existingColumns.get(expectedCol.name);

          if (!existing) {
            this.issues.push(`MISSING COLUMN: ${table.name}.${expectedCol.name}`);
            this.fixes.push(`ALTER TABLE ${table.name} ADD COLUMN ${expectedCol.name} ${expectedCol.type}${expectedCol.nullable === false ? ' NOT NULL' : ''}${expectedCol.default ? ` DEFAULT ${expectedCol.default}` : ''};`);
          } else {
            // Check type (simplified check)
            if (!existing.data_type.includes(expectedCol.type.replace('enum_', '').replace(/\(.*\)/, ''))) {
              this.issues.push(`TYPE MISMATCH: ${table.name}.${expectedCol.name} - Expected: ${expectedCol.type}, Found: ${existing.data_type}`);
            }

            // Check nullable
            if (expectedCol.nullable === false && existing.is_nullable === 'YES') {
              this.issues.push(`NULLABILITY MISMATCH: ${table.name}.${expectedCol.name} should be NOT NULL`);
            }

            console.log(`    ✅ ${table.name}.${expectedCol.name} (${existing.data_type})`);
          }
        }
      } catch (error) {
        this.issues.push(`ERROR checking columns for ${table.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async testIndexesExist() {
    console.log('\n🔍 Testing indexes...');

    for (const table of EXPECTED_SCHEMA) {
      if (!table.indexes) continue;

      try {
        const result = await this.client.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = $1
        `, [table.name]);

        const existingIndexes = new Set(result.rows.map(row => row.indexname));

        for (const expectedIndex of table.indexes) {
          if (!existingIndexes.has(expectedIndex)) {
            this.issues.push(`MISSING INDEX: ${expectedIndex} on ${table.name}`);
            this.fixes.push(`CREATE INDEX IF NOT EXISTS ${expectedIndex} ON ${table.name} (...); -- Add index definition`);
          } else {
            console.log(`    ✅ ${expectedIndex}`);
          }
        }
      } catch (error) {
        this.issues.push(`ERROR checking indexes for ${table.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async testConstraintsExist() {
    console.log('\n🔒 Testing constraints...');

    // Test foreign key constraints
    const fkConstraints = [
      { table: 'kisaan_users', constraint: 'kisaan_users_created_by_fkey', ref: 'kisaan_users(id)' },
      { table: 'kisaan_shops', constraint: 'kisaan_shops_owner_id_fkey', ref: 'kisaan_users(id)' },
      { table: 'kisaan_products', constraint: 'kisaan_products_category_id_fkey', ref: 'kisaan_categories(id)' },
      { table: 'kisaan_transactions', constraint: 'kisaan_transactions_shop_id_fkey', ref: 'kisaan_shops(id)' },
      { table: 'kisaan_payments', constraint: 'kisaan_payments_transaction_id_fkey', ref: 'kisaan_transactions(id)' },
    ];

    for (const fk of fkConstraints) {
      try {
        const result = await this.client.query(`
          SELECT conname
          FROM pg_constraint
          WHERE conname = $1 AND conrelid = $2::regclass
        `, [fk.constraint, fk.table]);

        if (result.rows.length === 0) {
          this.issues.push(`MISSING FK CONSTRAINT: ${fk.constraint} on ${fk.table}`);
          this.fixes.push(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint} FOREIGN KEY (...) REFERENCES ${fk.ref};`);
        } else {
          console.log(`    ✅ ${fk.constraint}`);
        }
      } catch (error) {
        this.issues.push(`ERROR checking constraint ${fk.constraint}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async testDataIntegrity() {
    console.log('\n🔍 Testing data integrity...');

    try {
      // Test balance consistency with ledger
      const balanceCheck = await this.client.query(`
        SELECT COUNT(*) as drift_count
        FROM (
          SELECT u.id, u.balance, COALESCE(SUM(l.delta_amount), 0) as ledger_sum
          FROM kisaan_users u
          LEFT JOIN kisaan_transaction_ledger l ON l.user_id = u.id
          GROUP BY u.id, u.balance
          HAVING ABS(u.balance - COALESCE(SUM(l.delta_amount), 0)) > 0.01
        ) t
      `);

      const driftCount = parseInt(balanceCheck.rows[0].drift_count);
      if (driftCount > 0) {
        this.issues.push(`DATA INTEGRITY: ${driftCount} users have balance drift between user.balance and ledger sum`);
        this.fixes.push('Run ledger reconciliation script to identify and fix balance inconsistencies');
      } else {
        console.log('    ✅ Balance integrity OK');
      }

      // Test orphaned records
      const orphanedTransactions = await this.client.query(`
        SELECT COUNT(*) as count
        FROM kisaan_transactions t
        LEFT JOIN kisaan_users f ON f.id = t.farmer_id
        LEFT JOIN kisaan_users b ON b.id = t.buyer_id
        WHERE f.id IS NULL OR b.id IS NULL
      `);

      if (parseInt(orphanedTransactions.rows[0].count) > 0) {
        this.issues.push(`DATA INTEGRITY: ${orphanedTransactions.rows[0].count} transactions reference non-existent users`);
      } else {
        console.log('    ✅ Transaction references OK');
      }

    } catch (error) {
      this.issues.push(`ERROR in data integrity check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async addPurposeColumns() {
    console.log('\n📝 Adding purpose columns where beneficial...');

    // Add purpose column to tables that could benefit from documentation
    const tablesToEnhance = [
      { table: 'kisaan_categories', column: 'purpose', type: 'TEXT', purpose: 'Detailed purpose and usage of this category' },
      { table: 'kisaan_products', column: 'purpose', type: 'TEXT', purpose: 'Detailed purpose and usage of this product' },
      { table: 'kisaan_commissions', column: 'purpose', type: 'TEXT', purpose: 'Purpose of this commission rate' },
    ];

    for (const enhancement of tablesToEnhance) {
      try {
        // Check if column exists
        const result = await this.client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
        `, [enhancement.table, enhancement.column]);

        if (result.rows.length === 0) {
          await this.client.query(`
            ALTER TABLE ${enhancement.table} ADD COLUMN ${enhancement.column} ${enhancement.type}
          `);
          console.log(`    ✅ Added ${enhancement.column} to ${enhancement.table}`);
          this.fixes.push(`Added purpose column to ${enhancement.table} for better documentation`);
        } else {
          console.log(`    ✅ ${enhancement.column} already exists in ${enhancement.table}`);
        }
      } catch (error) {
        this.issues.push(`ERROR adding purpose column to ${enhancement.table}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async cleanupAndFinalize() {
    console.log('\n🧹 Running cleanup and finalization...');

    try {
      // Update sequences if needed
      await this.client.query(`
        SELECT setval('kisaan_users_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_users), 1));
        SELECT setval('kisaan_transactions_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_transactions), 1));
        SELECT setval('kisaan_payments_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_payments), 1));
      `);
      console.log('    ✅ Sequences updated');

      // Vacuum analyze for optimization
      await this.client.query('VACUUM ANALYZE');
      console.log('    ✅ Database optimized');

    } catch (error) {
      this.issues.push(`ERROR in cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE STRUCTURE TEST RESULTS');
    console.log('='.repeat(60));

    if (this.issues.length === 0) {
      console.log('🎉 ALL TESTS PASSED! Database structure is clean and complete.');
    } else {
      console.log(`❌ Found ${this.issues.length} issues:`);
      this.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });

      console.log('\n🔧 Suggested fixes:');
      this.fixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }

    console.log('\n✅ Completed database structure validation');
  }
}

// Main execution
async function main() {
  const tester = new DatabaseStructureTester();

  try {
    await tester.connect();
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await tester.disconnect();
  }
}

main().catch(console.error);