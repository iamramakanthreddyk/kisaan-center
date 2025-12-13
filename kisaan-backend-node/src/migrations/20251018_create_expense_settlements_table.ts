import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface, SequelizeLib: typeof Sequelize) {
  await queryInterface.createTable('expense_settlements', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    expense_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'kisaan_expenses', key: 'id' },
      onDelete: 'CASCADE',
    },
    payment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'kisaan_payments', key: 'id' },
      onDelete: 'SET NULL',
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    settled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: SequelizeLib.literal('CURRENT_TIMESTAMP') },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: SequelizeLib.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: SequelizeLib.literal('CURRENT_TIMESTAMP') },
  });

  await queryInterface.addIndex('expense_settlements', ['expense_id']);
  await queryInterface.addIndex('expense_settlements', ['payment_id']);
  await queryInterface.addIndex('expense_settlements', ['settled_at']);
  await queryInterface.addIndex('expense_settlements', ['expense_id', 'settled_at']);
  await queryInterface.addIndex('expense_settlements', ['payment_id', 'expense_id']);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('expense_settlements');
}
