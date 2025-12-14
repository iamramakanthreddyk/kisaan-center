const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('kisaan_expenses', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      shop_id: { type: DataTypes.BIGINT, allowNull: false },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      type: { type: DataTypes.ENUM('expense', 'advance', 'adjustment'), allowNull: false, defaultValue: 'expense' },
      description: { type: DataTypes.TEXT, allowNull: true },
      transaction_id: { type: DataTypes.BIGINT, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'settled'), allowNull: false, defaultValue: 'pending' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('kisaan_expenses', ['shop_id', 'user_id', 'status'], { name: 'idx_kisaan_expenses_shop_user_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('kisaan_expenses', 'idx_kisaan_expenses_shop_user_status');
    await queryInterface.dropTable('kisaan_expenses');
  }
};
