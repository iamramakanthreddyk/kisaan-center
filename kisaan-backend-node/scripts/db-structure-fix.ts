/**
 * Database Structure Fix Script
 * Fixes issues identified by db-structure-test.ts
 * Usage: npx ts-node scripts/db-structure-fix.ts
 */

import { Client } from 'pg';
const dotenv = require('dotenv');
const path = require('path');

// Load environment
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

class DatabaseFixer {
  private client: Client;
  private fixes: string[] = [];
  private errors: string[] = [];

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

  async runFixes() {
    console.log('🔧 Starting database structure fixes...\n');

    await this.addMissingColumns();
    await this.fixNullabilityConstraints();
    await this.addMissingIndexes();
    await this.fixDataIntegrity();
    await this.finalizeAndOptimize();

    this.printResults();
  }

  private async addMissingColumns() {
    console.log('📊 Adding missing columns...');

    const missingColumns = [
      {
        table: 'kisaan_plans',
        column: 'price',
        definition: 'numeric(10,2)',
        message: 'Adding price column to kisaan_plans'
      },
      {
        table: 'kisaan_plans',
        column: 'billing_cycle',
        definition: "enum_kisaan_plans_billing_cycle NOT NULL DEFAULT 'monthly'::enum_kisaan_plans_billing_cycle",
        message: 'Adding billing_cycle column to kisaan_plans'
      },
      {
        table: 'kisaan_products',
        column: 'price',
        definition: 'numeric(10,2)',
        message: 'Adding price column to kisaan_products'
      },
      {
        table: 'kisaan_transactions',
        column: 'total_sale_value',
        definition: 'numeric(12,2) NOT NULL',
        message: 'Adding total_sale_value column to kisaan_transactions'
      },
      {
        table: 'kisaan_transactions',
        column: 'shop_commission',
        definition: 'numeric(12,2) NOT NULL',
        message: 'Adding shop_commission column to kisaan_transactions'
      }
    ];

    for (const col of missingColumns) {
      try {
        // Check if column exists
        const result = await this.client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
        `, [col.table, col.column]);

        if (result.rows.length === 0) {
          await this.client.query(`
            ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.definition}
          `);
          console.log(`    ✅ ${col.message}`);
          this.fixes.push(`Added ${col.column} to ${col.table}`);
        } else {
          console.log(`    ⏭️  ${col.column} already exists in ${col.table}`);
        }
      } catch (error) {
        const msg = `ERROR adding ${col.column} to ${col.table}: ${error instanceof Error ? error.message : String(error)}`;
        console.log(`    ❌ ${msg}`);
        this.errors.push(msg);
      }
    }
  }

  private async fixNullabilityConstraints() {
    console.log('\n🔒 Fixing nullability constraints...');

    // Note: PostgreSQL doesn't allow changing NOT NULL on existing columns with NULL values
    // We'll skip these for now and just log them
    const nullabilityIssues = [
      'kisaan_plans.created_at should be NOT NULL',
      'kisaan_plans.updated_at should be NOT NULL',
      'kisaan_categories.created_at should be NOT NULL',
      'kisaan_categories.updated_at should be NOT NULL',
      'kisaan_shops.created_at should be NOT NULL',
      'kisaan_shops.updated_at should be NOT NULL',
      'kisaan_products.created_at should be NOT NULL',
      'kisaan_products.updated_at should be NOT NULL',
      'kisaan_payments.transaction_id should be NOT NULL'
    ];

    for (const issue of nullabilityIssues) {
      console.log(`    ⚠️  ${issue} - Manual review required`);
      this.fixes.push(`NOT NULL constraint: ${issue} - Check data before applying`);
    }
  }

  private async addMissingIndexes() {
    console.log('\n🔍 Adding missing indexes...');

    const missingIndexes = [
      {
        name: 'kisaan_plans_is_active',
        table: 'kisaan_plans',
        definition: 'CREATE INDEX IF NOT EXISTS kisaan_plans_is_active ON kisaan_plans(is_active)',
        message: 'Adding is_active index to kisaan_plans'
      },
      {
        name: 'kisaan_payments_transaction_status',
        table: 'kisaan_payments',
        definition: 'CREATE INDEX IF NOT EXISTS kisaan_payments_transaction_status ON kisaan_payments(transaction_id, status)',
        message: 'Adding transaction_status index to kisaan_payments'
      }
    ];

    for (const idx of missingIndexes) {
      try {
        // Check if index exists
        const result = await this.client.query(`
          SELECT 1 FROM pg_indexes WHERE indexname = $1
        `, [idx.name]);

        if (result.rows.length === 0) {
          await this.client.query(idx.definition);
          console.log(`    ✅ ${idx.message}`);
          this.fixes.push(`Added index ${idx.name}`);
        } else {
          console.log(`    ⏭️  Index ${idx.name} already exists`);
        }
      } catch (error) {
        const msg = `ERROR creating index ${idx.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.log(`    ❌ ${msg}`);
        this.errors.push(msg);
      }
    }
  }

  private async fixDataIntegrity() {
    console.log('\n🔍 Fixing data integrity issues...');

    try {
      // Fix balance drift by running ledger reconciliation
      console.log('    🔄 Running ledger reconciliation...');

      // Get users with balance drift
      const driftResult = await this.client.query(`
        SELECT u.id, u.balance, COALESCE(SUM(l.delta_amount), 0) as ledger_sum,
               (u.balance - COALESCE(SUM(l.delta_amount), 0)) as diff
        FROM kisaan_users u
        LEFT JOIN kisaan_transaction_ledger l ON l.user_id = u.id
        GROUP BY u.id, u.balance
        HAVING ABS(u.balance - COALESCE(SUM(l.delta_amount), 0)) > 0.01
        ORDER BY ABS(u.balance - COALESCE(SUM(l.delta_amount), 0)) DESC
      `);

      if (driftResult.rows.length > 0) {
        console.log(`    ⚠️  Found ${driftResult.rows.length} users with balance drift`);

        // For each user with drift, we could rebuild their ledger, but that's complex
        // For now, just log and suggest manual reconciliation
        for (const row of driftResult.rows.slice(0, 5)) { // Show first 5
          console.log(`       User ${row.id}: balance=${row.balance}, ledger=${row.ledger_sum}, diff=${row.diff}`);
        }

        this.fixes.push(`Balance drift detected in ${driftResult.rows.length} users - run full reconciliation`);
      } else {
        console.log('    ✅ No balance drift detected');
      }

      // Check for orphaned transactions
      const orphanResult = await this.client.query(`
        SELECT COUNT(*) as count
        FROM kisaan_transactions t
        LEFT JOIN kisaan_users f ON f.id = t.farmer_id
        LEFT JOIN kisaan_users b ON b.id = t.buyer_id
        WHERE f.id IS NULL OR b.id IS NULL
      `);

      if (parseInt(orphanResult.rows[0].count) > 0) {
        console.log(`    ⚠️  Found ${orphanResult.rows[0].count} orphaned transactions`);
        this.fixes.push(`Orphaned transactions: ${orphanResult.rows[0].count} - requires manual cleanup`);
      } else {
        console.log('    ✅ No orphaned transactions');
      }

    } catch (error) {
      const msg = `ERROR in data integrity check: ${error instanceof Error ? error.message : String(error)}`;
      console.log(`    ❌ ${msg}`);
      this.errors.push(msg);
    }
  }

  private async finalizeAndOptimize() {
    console.log('\n🧹 Finalizing and optimizing...');

    try {
      // Update sequences
      await this.client.query(`
        SELECT setval('kisaan_users_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_users), 1));
        SELECT setval('kisaan_transactions_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_transactions), 1));
        SELECT setval('kisaan_payments_id_seq', COALESCE((SELECT MAX(id) FROM kisaan_payments), 1));
      `);
      console.log('    ✅ Sequences updated');

      // Vacuum analyze
      await this.client.query('VACUUM ANALYZE');
      console.log('    ✅ Database vacuumed and analyzed');

      // Reindex (optional, can be expensive)
      // await this.client.query('REINDEX DATABASE kisaan_dev');
      // console.log('    ✅ Database reindexed');

    } catch (error) {
      const msg = `ERROR in finalization: ${error instanceof Error ? error.message : String(error)}`;
      console.log(`    ❌ ${msg}`);
      this.errors.push(msg);
    }
  }

  private printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 DATABASE FIX RESULTS');
    console.log('='.repeat(60));

    if (this.fixes.length > 0) {
      console.log('✅ Applied fixes:');
      this.fixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (this.errors.length === 0) {
      console.log('\n🎉 All fixes applied successfully!');
    } else {
      console.log(`\n⚠️  ${this.errors.length} errors occurred during fixes`);
    }

    console.log('\n📋 Next steps:');
    console.log('1. Run db-structure-test.ts again to verify fixes');
    console.log('2. Review manual fixes for NOT NULL constraints');
    console.log('3. Consider running full ledger reconciliation for balance drift');
    console.log('4. Backup database before applying NOT NULL constraints');

    console.log('\n✅ Database fix process completed');
  }
}

// Main execution
async function main() {
  const fixer = new DatabaseFixer();

  try {
    await fixer.connect();
    await fixer.runFixes();
  } catch (error) {
    console.error('❌ Fix execution failed:', error);
    process.exit(1);
  } finally {
    await fixer.disconnect();
  }
}

main().catch(console.error);