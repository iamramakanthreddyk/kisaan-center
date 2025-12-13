require('dotenv').config({ path: './.env' });
const { Sequelize } = require('sequelize');

async function runMigration() {
  let sequelize;

  try {
    console.log('Connecting to database for migration...');

    sequelize = new Sequelize(
      process.env.DB_NAME || 'kisaan_dev',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
        ...(process.env.DB_SSL_MODE === 'require' ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        } : {})
      }
    );

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection successful.\n');

    console.log('Running migration: Create Ledger Tables...\n');

    // Create the append-only ledger table
    console.log('Creating kisaan_ledger_entries table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kisaan_ledger_entries (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
        type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id BIGINT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by BIGINT,
        CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_ledger_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE RESTRICT
      )
    `);

    // Create indexes for ledger table
    console.log('Creating indexes on kisaan_ledger_entries...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_user_shop ON kisaan_ledger_entries(user_id, shop_id)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON kisaan_ledger_entries(created_at DESC)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_type ON kisaan_ledger_entries(type)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_reference ON kisaan_ledger_entries(reference_type, reference_id)
    `);

    // Create the pre-calculated balance table
    console.log('Creating kisaan_user_balances table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kisaan_user_balances (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        shop_id BIGINT NOT NULL,
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_user_balance_unique UNIQUE (user_id, shop_id),
        CONSTRAINT fk_balance_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_balance_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE RESTRICT
      )
    `);

    // Create index for balance table
    console.log('Creating index on kisaan_user_balances...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_balance_user_shop ON kisaan_user_balances(user_id, shop_id)
    `);

    // Add created_by column to kisaan_expenses if it doesn't exist
    console.log('Updating kisaan_expenses table...');
    await sequelize.query(`
      ALTER TABLE IF EXISTS kisaan_expenses 
      ADD COLUMN IF NOT EXISTS created_by BIGINT
    `);

    console.log('✅ Migration completed successfully!');

  } catch (e) {
    console.log('Migration failed:', e.message);
    console.log('Stack:', e.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

runMigration();