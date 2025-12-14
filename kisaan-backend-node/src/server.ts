
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

async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Optionally run migrations programmatically on startup
    if (String(process.env.RUN_MIGRATIONS_ON_STARTUP).toLowerCase() === 'true') {
      console.log('🔄 RUN_MIGRATIONS_ON_STARTUP is enabled — running migrations');
      try {
        await runAllMigrations();
        console.log('✅ Programmatic migrations completed');
      } catch (e) {
        console.error('✖ Migration run failed on startup:', e instanceof Error ? e.message : e);
        throw e; // let outer catch handle process exit
      }
    }
    
    // Create schema from SQL file unless explicitly skipped; migrations can run afterward
    const skipSchemaInit = String(process.env.SKIP_SCHEMA_INIT || '').toLowerCase() === 'true';
    if (skipSchemaInit) {
      console.log('⏭️  SKIP_SCHEMA_INIT=true set, skipping unified-schema apply');
    } else {
      let schemaPath;
      if (process.env.DB_DIALECT === 'sqlite') {
        schemaPath = path.join(__dirname, '..', '..', 'local-sqlite-setup', 'schema.sqlite.sql');
      } else {
        schemaPath = path.join(__dirname, '..', 'schema', 'unified-schema.sql');
      }
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      const schemaHash = createHash('sha256').update(schemaSQL).digest('hex');
      console.log('🔄 Creating database schema from', schemaPath);
      console.log('📄 Schema SHA256 (first 12):', schemaHash.slice(0, 12));
      try {
        await sequelize.query(schemaSQL);
        console.log('✅ Database schema created.');
      } catch (err) {
        if (err && typeof err === 'object' && 'parent' in (err as Record<string, unknown>)) {
          const parent = (err as { parent?: { position?: string } }).parent;
          const pos = parent?.position ? Number(parent.position) : undefined;
          if (pos && Number.isFinite(pos)) {
            const start = Math.max(0, pos - 120);
            const end = Math.min(schemaSQL.length, pos + 120);
            const snippet = schemaSQL.slice(start, end);
            console.error('✖ Schema creation failed near position', pos, 'snippet:\n', snippet);
          }
        }
        console.error('✖ Schema creation failed:', err);
        throw err;
      }
    }

    // For SQLite local setups, ensure legacy columns exist (non-destructive)
    if (process.env.DB_DIALECT === 'sqlite') {
      try {
        // Add commission_rate to transactions if it doesn't exist
        const res: ColumnInfo[] = await sequelize.query("PRAGMA table_info('kisaan_transactions')", { type: QueryTypes.SELECT });
        const hasCommissionRate = Array.isArray(res) && res.some((col) => col.name === 'commission_rate');
        if (!hasCommissionRate) {
          console.log('🔧 Adding missing column `commission_rate` to kisaan_transactions');
          await sequelize.query('ALTER TABLE kisaan_transactions ADD COLUMN commission_rate REAL');
        }
            // Add total_amount to transactions if it doesn't exist (some older local DBs)
            const hasTotalAmount = Array.isArray(res) && res.some((col) => col.name === 'total_amount');
            if (!hasTotalAmount) {
              console.log('🔧 Adding missing column `total_amount` to kisaan_transactions');
              await sequelize.query('ALTER TABLE kisaan_transactions ADD COLUMN total_amount REAL DEFAULT 0');
            }
        // Ensure kisaan_expenses table exists (some local DBs may be missing it)
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
          // Ensure ledger has commission and net columns
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
