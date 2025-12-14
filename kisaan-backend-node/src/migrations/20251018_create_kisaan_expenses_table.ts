import { QueryInterface, DataTypes } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
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

    // Only create the index if it does not exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c WHERE c.relname = 'idx_kisaan_expenses_shop_user_status'
        ) THEN
          CREATE INDEX idx_kisaan_expenses_shop_user_status ON kisaan_expenses (shop_id, user_id, status);
        END IF;
      END$$;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('kisaan_expenses', 'idx_kisaan_expenses_shop_user_status');
    await queryInterface.dropTable('kisaan_expenses');
  }
};
