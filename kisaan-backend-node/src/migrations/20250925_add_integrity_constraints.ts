/**
 * Migration: Add data integrity constraints to prevent silent duplication that can inflate commission figures.
 * - Unique composite on (payment_id, transaction_id) for kisaan_payment_allocations to block duplicate allocation rows from same payment to same transaction.
 * - (Optional) Partial unique index for transaction idempotency key already handled at app layer; included here as commented scaffold if needed later.
 */
import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Discover actual payment allocation table name (legacy vs new) for safety
  const tables = await queryInterface.showAllTables() as unknown[];
  const names = tables.map((t) => (t && typeof t === 'object' && 'tableName' in t) ? (t as { tableName: string }).tableName : String(t));
    const allocTable = names.includes('kisaan_payment_allocations')
      ? 'kisaan_payment_allocations'
      : (names.includes('payment_allocations') ? 'payment_allocations' : null);
    if (allocTable) {
      // Create unique index only if it does not exist
      try {
        await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_${allocTable}_payment_txn ON ${allocTable}(payment_id, transaction_id)`);
      } catch (e: unknown) {
        const err = e as Error;
        console.warn('[migration] unique index create failed (may already exist):', err?.message || e);
      }
    } else {
      console.warn('[migration] allocation table not found, skipping unique constraint');
    }

    // NOTE: Transaction idempotency uniqueness is enforced logically; if a physical table is later added for keys, add its constraint here.
  },
  down: async (queryInterface: QueryInterface) => {
  const tables = await queryInterface.showAllTables() as unknown[];
  const names = tables.map((t) => (t && typeof t === 'object' && 'tableName' in t) ? (t as { tableName: string }).tableName : String(t));
    const allocTable = names.includes('kisaan_payment_allocations')
      ? 'kisaan_payment_allocations'
      : (names.includes('payment_allocations') ? 'payment_allocations' : null);
    if (allocTable) {
      try {
        await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ux_${allocTable}_payment_txn`);
      } catch (e: unknown) {
        const err = e as Error;
        console.warn('[migration:down] drop unique index failed:', err?.message || e);
      }
    }
  }
};
