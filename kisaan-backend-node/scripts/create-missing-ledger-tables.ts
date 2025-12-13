import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

async function main() {
  const useSSL = process.env.DB_SSL_MODE === 'require';
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  );
  try {
    await sequelize.authenticate();
    console.log('Connected. Checking missing tables...');

    const checks = [
      { name: 'kisaan_payment_allocations', ddl: `CREATE SEQUENCE IF NOT EXISTS kisaan_payment_allocations_id_seq START 1;
CREATE TABLE IF NOT EXISTS kisaan_payment_allocations (
  id INTEGER DEFAULT nextval('kisaan_payment_allocations_id_seq') NOT NULL,
  payment_id INTEGER NOT NULL,
  transaction_id INTEGER NOT NULL,
  allocated_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT kisaan_payment_allocations_pkey PRIMARY KEY (id),
  CONSTRAINT kisaan_payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES kisaan_payments(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT kisaan_payment_allocations_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES kisaan_transactions(id) ON UPDATE CASCADE ON DELETE CASCADE
);` },
      { name: 'kisaan_balance_snapshots', ddl: `CREATE SEQUENCE IF NOT EXISTS kisaan_balance_snapshots_id_seq START 1;
CREATE TABLE IF NOT EXISTS kisaan_balance_snapshots (
  id INTEGER DEFAULT nextval('kisaan_balance_snapshots_id_seq') NOT NULL,
  user_id BIGINT NOT NULL,
  balance_type VARCHAR(20) NOT NULL,
  balance NUMERIC(16,4),
  previous_balance NUMERIC(16,4) DEFAULT 0.00 NOT NULL,
  amount_change NUMERIC(16,4) DEFAULT 0.00 NOT NULL,
  new_balance NUMERIC(16,4) DEFAULT 0.00 NOT NULL,
  transaction_type VARCHAR(40) NOT NULL,
  reference_id BIGINT,
  reference_type VARCHAR(40),
  description TEXT,
  snapshot_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT kisaan_balance_snapshots_pkey PRIMARY KEY (id)
);` }
    ];

    for (const c of checks) {
      const [result]: any = await sequelize.query("SELECT to_regclass('public." + c.name + "') as exists");
      if (!result[0].exists) {
        console.log(`Creating missing table: ${c.name}`);
        await sequelize.query(c.ddl);
        console.log(`✅ Created ${c.name}`);
      } else {
        console.log(`Already present: ${c.name}`);
      }
    }

    console.log('Done.');
  } catch (err: any) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) main();
