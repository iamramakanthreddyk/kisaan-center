import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Cleanup duplicate monetary columns & standardize table names
 * Changes:
 *  - Drop legacy columns total_sale_value, shop_commission from kisaan_transactions
 *  - Ensure canonical columns total_amount, commission_amount, farmer_earning are NOT NULL DECIMAL(12,2)
 *  - Rename tables payment_allocations -> kisaan_payment_allocations, balance_snapshots -> kisaan_balance_snapshots
 */
export = {
  up: async (queryInterface: QueryInterface) => {
    // Table rename safety: only rename if old exists and new does not
    const showTables = await queryInterface.showAllTables();
    const normalized = showTables.map((t: any) => (t && typeof t === 'object' && 'tableName' in t) ? t.tableName : String(t));

    if (normalized.includes('payment_allocations') && !normalized.includes('kisaan_payment_allocations')) {
      await queryInterface.renameTable('payment_allocations', 'kisaan_payment_allocations');
    }
    if (normalized.includes('balance_snapshots') && !normalized.includes('kisaan_balance_snapshots')) {
      await queryInterface.renameTable('balance_snapshots', 'kisaan_balance_snapshots');
    }

    // Transaction table adjustments
    // 1. Drop legacy duplicate columns if they exist
    const txnDesc = await queryInterface.describeTable('kisaan_transactions');
    if (txnDesc.total_sale_value) {
      await queryInterface.removeColumn('kisaan_transactions', 'total_sale_value');
    }
    if (txnDesc.shop_commission) {
      await queryInterface.removeColumn('kisaan_transactions', 'shop_commission');
    }
    // 2. Ensure canonical columns exist & are non-null with correct types
    // (Altering: some dialects require using changeColumn)
    if (txnDesc.total_amount) {
      await queryInterface.changeColumn('kisaan_transactions', 'total_amount', {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false,
        defaultValue: 0
      });
    }
    if (txnDesc.commission_amount) {
      await queryInterface.changeColumn('kisaan_transactions', 'commission_amount', {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false,
        defaultValue: 0
      });
    }
    if (txnDesc.farmer_earning) {
      await queryInterface.changeColumn('kisaan_transactions', 'farmer_earning', {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false,
        defaultValue: 0
      });
    }
  },
  down: async (queryInterface: QueryInterface) => {
    // Recreate dropped columns (nullable) and revert table renames
    const showTables = await queryInterface.showAllTables();
    const normalized = showTables.map((t: any) => (t && typeof t === 'object' && 'tableName' in t) ? t.tableName : String(t));

    if (normalized.includes('kisaan_payment_allocations') && !normalized.includes('payment_allocations')) {
      await queryInterface.renameTable('kisaan_payment_allocations', 'payment_allocations');
    }
    if (normalized.includes('kisaan_balance_snapshots') && !normalized.includes('balance_snapshots')) {
      await queryInterface.renameTable('kisaan_balance_snapshots', 'balance_snapshots');
    }

    const txnDesc = await queryInterface.describeTable('kisaan_transactions');
    if (!txnDesc.total_sale_value) {
      await queryInterface.addColumn('kisaan_transactions', 'total_sale_value', { type: DataTypes.DECIMAL(12,2), allowNull: true });
    }
    if (!txnDesc.shop_commission) {
      await queryInterface.addColumn('kisaan_transactions', 'shop_commission', { type: DataTypes.DECIMAL(12,2), allowNull: true });
    }
  }
};
