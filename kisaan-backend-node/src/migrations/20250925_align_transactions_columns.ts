// Migration: Align kisaan_transactions schema with model definitions
// Adds missing financial and reference columns if they do not exist.
// Safe to run multiple times (idempotent guards per column).


module.exports = {
  up: async (queryInterface: import('sequelize').QueryInterface) => {
  // Helper to add column if missing, cross-dialect
  async function ensureColumn(table: string, column: string, definition: string) {
    const dialect = queryInterface.sequelize.getDialect();
    let exists = false;
    if (dialect === 'sqlite') {
      // Use PRAGMA for SQLite
      const [results] = (await queryInterface.sequelize.query(`PRAGMA table_info(${table});`)) as unknown as [Array<{ name: string }>, unknown];
      exists = Array.isArray(results) && results.some((r: { name: string }) => r.name === column);
    } else {
      // Use information_schema for Postgres/MySQL
      const [results] = (await queryInterface.sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}'`)) as unknown as [Array<{ column_name: string }>, unknown];
      exists = Array.isArray(results) && results.some((r: { column_name: string }) => r.column_name === column);
    }
    if (!exists) {
      console.log(`[migration] Adding ${column} to ${table}`);
      await queryInterface.sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  // Ensure core transaction monetary columns
  await ensureColumn('kisaan_transactions', 'total_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
  await ensureColumn('kisaan_transactions', 'commission_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
  await ensureColumn('kisaan_transactions', 'farmer_earning', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
  await ensureColumn('kisaan_transactions', 'commission_rate', 'DECIMAL(6,4)');
  await ensureColumn('kisaan_transactions', 'product_id', 'BIGINT');
  await ensureColumn('kisaan_transactions', 'commission_type', "VARCHAR(30)");
  await ensureColumn('kisaan_transactions', 'status', "VARCHAR(20)");
  await ensureColumn('kisaan_transactions', 'transaction_date', 'TIMESTAMP');
  await ensureColumn('kisaan_transactions', 'settlement_date', 'TIMESTAMP');
  await ensureColumn('kisaan_transactions', 'notes', 'TEXT');
  await ensureColumn('kisaan_transactions', 'metadata', 'JSONB');

  // Indexes (ignore errors if already exist)
  await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_kisaan_transactions_product_id ON kisaan_transactions(product_id)');
  await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_kisaan_transactions_created_at ON kisaan_transactions(created_at)');
  },

  down: async () => {
    // Irreversible (no-op) – intentionally empty because columns may be in active use.
    console.log('[migration] 20250925_align_transactions_columns down() no-op');
  }
};