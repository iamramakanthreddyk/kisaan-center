import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Creates table `kisaan_transaction_idempotency` to ensure idempotent transaction creation.
 */
export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('kisaan_transaction_idempotency', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      buyer_id: { type: DataTypes.BIGINT, allowNull: false },
      farmer_id: { type: DataTypes.BIGINT, allowNull: false },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      total_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
      transaction_id: { type: DataTypes.BIGINT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await queryInterface.addIndex('kisaan_transaction_idempotency', ['key'], { unique: true, name: 'idx_idem_key' });
    await queryInterface.addIndex('kisaan_transaction_idempotency', ['buyer_id']);
    await queryInterface.addIndex('kisaan_transaction_idempotency', ['farmer_id']);
    await queryInterface.addIndex('kisaan_transaction_idempotency', ['shop_id']);
    await queryInterface.addIndex('kisaan_transaction_idempotency', ['transaction_id']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('kisaan_transaction_idempotency');
  }
};
