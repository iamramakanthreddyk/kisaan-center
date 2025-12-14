/**
 * Migration: Create kisaan_payment_allocations table and add allocated_amount to kisaan_payments
 */
module.exports = {
  up: async (queryInterface) => {
    // Create allocations table if missing
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('kisaan_payment_allocations')) {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS kisaan_payment_allocations (
          id SERIAL PRIMARY KEY,
          payment_id INTEGER NOT NULL REFERENCES kisaan_payments(id) ON DELETE CASCADE,
          transaction_id INTEGER NOT NULL REFERENCES kisaan_transactions(id) ON DELETE CASCADE,
          allocated_amount DECIMAL(15,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    }

    // Add allocated_amount column to kisaan_payments for quick reads if missing (cross-dialect)
    const paymentDesc = await queryInterface.describeTable('kisaan_payments');
    if (!paymentDesc['allocated_amount']) {
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === 'sqlite') {
        // SQLite does not support IF NOT EXISTS, just add if missing
        await queryInterface.sequelize.query(
          `ALTER TABLE kisaan_payments ADD COLUMN allocated_amount DECIMAL(15,2) DEFAULT 0;`
        );
      } else {
        // Postgres/MySQL
        await queryInterface.sequelize.query(
          `ALTER TABLE kisaan_payments ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(15,2) DEFAULT 0;`
        );
      }
    }
  },
  down: async (queryInterface) => {
    const paymentDesc = await queryInterface.describeTable('kisaan_payments');
    if (paymentDesc['allocated_amount']) {
      await queryInterface.removeColumn('kisaan_payments', 'allocated_amount');
    }

    const tables = await queryInterface.showAllTables();
    if (tables.includes('kisaan_payment_allocations')) {
      await queryInterface.dropTable('kisaan_payment_allocations');
    }
  }
};
