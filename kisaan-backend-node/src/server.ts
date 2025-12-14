
import app from './app';
import { logger } from './shared/logging/logger';
import sequelize from './config/database';
import './models'; // Import models to ensure they're initialized
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
// Optional programmatic migration runner (safe to require)
import { runAllMigrations } from '../scripts/run-migration';
import { QueryTypes } from 'sequelize';

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

dotenv.config();

const PORT = process.env.API_PORT || process.env.PORT || 8000;

function getUnifiedSchemaPath() {
  // __dirname is dist/src in production, src in dev
  const projectRoot = path.resolve(__dirname, '..', '..');
  // Common locations depending on whether running from source or compiled dist
  const candidates = [
    path.join(projectRoot, 'schema', 'unified-schema.sql'),
    path.join(projectRoot, 'dist', 'schema', 'unified-schema.sql'),
    path.join(projectRoot, '..', 'schema', 'unified-schema.sql'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // default to the repo-level path (may not exist in some builds)
  return path.join(projectRoot, 'schema', 'unified-schema.sql');
}

async function startServer() {
  try {
    console.log('🔄 Connecting to database...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Schedule migrations in background if requested
    if (String(process.env.RUN_MIGRATIONS_ON_STARTUP).toLowerCase() === 'true') {
      console.log('🔄 RUN_MIGRATIONS_ON_STARTUP is enabled — scheduling migrations (background)');
      (async () => {
        try {
          await runAllMigrations();
          console.log('✅ Programmatic migrations completed (background)');
        } catch (e) {
          console.error('✖ Migration run failed in background:', e instanceof Error ? e.message : e);
        }
      })();
    }

    // Apply unified schema in background unless explicitly skipped
    const skipSchemaInit = String(process.env.SKIP_SCHEMA_INIT || '').toLowerCase() === 'true';
    if (skipSchemaInit) {
      console.log('⏭️  SKIP_SCHEMA_INIT=true set, skipping unified-schema apply');
    } else {
      (async () => {
        try {
          let schemaPath: string;
          if (process.env.DB_DIALECT === 'sqlite') {
            schemaPath = path.join(__dirname, '..', '..', 'local-sqlite-setup', 'schema.sqlite.sql');
          } else {
            schemaPath = getUnifiedSchemaPath();
          }
          if (!fs.existsSync(schemaPath)) {
            console.warn(`⚠️ (background) Schema file not found at ${schemaPath} — skipping apply`);
            return;
          }
          const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
          const schemaHash = createHash('sha256').update(schemaSQL).digest('hex');
          console.log('🔄 (background) Creating database schema from', schemaPath);
          console.log('📄 (background) Schema SHA256 (first 12):', schemaHash.slice(0, 12));

          // If DB already has kisaan_ tables, skip apply to avoid re-initialization
          const existing = await sequelize.query<{ count: number }>(
            `SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'kisaan_%'`,
            { type: QueryTypes.SELECT }
          );
          const existingCount = Array.isArray(existing) && existing.length ? (existing[0] as any).count : 0;
          if (existingCount > 0) {
            console.log(`ℹ️ (background) Detected ${existingCount} existing kisaan_ tables — skipping schema apply`);
          } else {
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
              try {
                await sequelize.query(schemaSQL);
                console.log('✅ (background) Database schema applied.');
                break;
              } catch (err) {
                console.warn(`⚠️ (background) Schema apply attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
                if (attempt === maxAttempts) {
                  console.error('✖ (background) Schema creation failed after retries:', err);
                } else {
                  await new Promise((res) => setTimeout(res, attempt * 2000));
                }
              }
            }
          }
        } catch (err) {
          console.error('✖ (background) Schema creation failed:', err instanceof Error ? err.message : err);
        }
      })();
    }

    // If using sqlite, schedule legacy column/table fixes in background
    if (process.env.DB_DIALECT === 'sqlite') {
      (async () => {
        try {
          const res: ColumnInfo[] = await sequelize.query("PRAGMA table_info('kisaan_transactions')", { type: QueryTypes.SELECT });
          const hasCommissionRate = Array.isArray(res) && res.some((col) => col.name === 'commission_rate');
          if (!hasCommissionRate) {
            console.log('🔧 Adding missing column `commission_rate` to kisaan_transactions');
            await sequelize.query('ALTER TABLE kisaan_transactions ADD COLUMN commission_rate REAL');
          }

          const hasTotalAmount = Array.isArray(res) && res.some((col) => col.name === 'total_amount');
          if (!hasTotalAmount) {
            console.log('🔧 Adding missing column `total_amount` to kisaan_transactions');
            await sequelize.query('ALTER TABLE kisaan_transactions ADD COLUMN total_amount REAL DEFAULT 0');
          }

          const expensesInfo: ColumnInfo[] = await sequelize.query("PRAGMA table_info('kisaan_expenses')", { type: QueryTypes.SELECT });
          const hasExpenses = Array.isArray(expensesInfo) && expensesInfo.length > 0;
          if (!hasExpenses) {
            console.log('🔧 Creating missing table `kisaan_expenses` (sqlite local dev)');
            await sequelize.query(`
              CREATE TABLE IF NOT EXISTS kisaan_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL DEFAULT 'expense',
                description TEXT,
                transaction_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                expense_date TEXT,
                category TEXT,
                ledger_entry_id INTEGER,
                created_by INTEGER,
                deleted_at TEXT,
                total_amount REAL,
                allocated_amount REAL DEFAULT 0,
                remaining_amount REAL,
                allocation_status TEXT DEFAULT 'UNALLOCATED',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
              )
            `);
          }

          const ledgerInfo: ColumnInfo[] = await sequelize.query("PRAGMA table_info('kisaan_ledger')", { type: QueryTypes.SELECT });
          const ledgerCols = Array.isArray(ledgerInfo) ? ledgerInfo.map((c) => c.name) : [];
          if (!ledgerCols.includes('commission_rate')) {
            console.log('🔧 Adding missing column `commission_rate` to kisaan_ledger');
            await sequelize.query('ALTER TABLE kisaan_ledger ADD COLUMN commission_rate REAL');
          }
          if (!ledgerCols.includes('commission_amount')) {
            console.log('🔧 Adding missing column `commission_amount` to kisaan_ledger');
            await sequelize.query('ALTER TABLE kisaan_ledger ADD COLUMN commission_amount REAL');
          }
          if (!ledgerCols.includes('net_amount')) {
            console.log('🔧 Adding missing column `net_amount` to kisaan_ledger');
            await sequelize.query('ALTER TABLE kisaan_ledger ADD COLUMN net_amount REAL');
          }
        } catch (e) {
          console.warn('⚠️  Could not ensure legacy columns for SQLite:', e instanceof Error ? e.message : e);
        }
      })();
    }

    // Ensure `custom_commission_rate` exists on kisaan_users for Postgres/other dialects
    if (process.env.DB_DIALECT !== 'sqlite') {
      (async () => {
        try {
          const colCheck = await sequelize.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name = 'kisaan_users' AND column_name = 'custom_commission_rate' LIMIT 1",
            { type: QueryTypes.SELECT }
          );
          const exists = Array.isArray(colCheck) && colCheck.length > 0;
          if (!exists) {
            console.log('🔧 Adding missing column `custom_commission_rate` to kisaan_users');
            // Use IF NOT EXISTS to be safe on concurrent runs
            await sequelize.query("ALTER TABLE kisaan_users ADD COLUMN IF NOT EXISTS custom_commission_rate DECIMAL(6,4)");
          }
        } catch (e) {
          console.warn('⚠️ Could not ensure column custom_commission_rate on kisaan_users:', e instanceof Error ? e.message : e);
        }
      })();
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 KisaanCenter Backend Server running on port ${PORT}`);
      console.log(`📚 Available endpoints:`);
      console.log(`   • GET  /health - Health check`);
      console.log(`   • GET  /api/test - Test endpoint`);
      console.log(`   • POST /api/auth/login - User login`);
      console.log(`   • POST /api/auth/register - User registration`);
      console.log(`   • GET  /api/users - Get all users`);
      console.log(`   • POST /api/users - Create user`);
      console.log(`   • GET  /api/shops - Get all shops`);
      console.log(`   • POST /api/shops - Create shop`);
      console.log(`   • GET  /api/shops/:id - Get shop by ID`);
      console.log(`   • PUT  /api/shops/:id - Update shop`);
      console.log(`   • DELETE /api/shops/:id - Delete shop`);
      console.log(`\n🌐 Server URL: http://localhost:${PORT}`);
      console.log(`🌐 Health Check: http://localhost:${PORT}/health`);
    });

    return server;
  } catch (error: unknown) {
    logger.error({ err: error }, 'unable to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error: unknown) {
    logger.error({ err: error }, 'error closing database connection (SIGTERM)');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error: unknown) {
    logger.error({ err: error }, 'error closing database connection (SIGINT)');
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise) => {
  logger.error({ reason, promise }, 'unhandled promise rejection');
  process.exit(1);
});

startServer();
