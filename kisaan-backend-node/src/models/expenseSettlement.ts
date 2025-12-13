import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Expense } from './expense';
import { Payment } from './payment';

export interface ExpenseSettlementAttributes {
  id: number;
  expense_id: number;
  payment_id?: number;
  amount: number;
  settled_at: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseSettlementCreationAttributes extends Optional<ExpenseSettlementAttributes, 'id' | 'payment_id' | 'settled_at' | 'notes' | 'created_at' | 'updated_at'> {}

export class ExpenseSettlement extends Model<ExpenseSettlementAttributes, ExpenseSettlementCreationAttributes>
  implements ExpenseSettlementAttributes {
  public id!: number;
  public expense_id!: number;
  public payment_id?: number;
  public amount!: number;
  public settled_at!: Date;
  public notes?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public readonly expense?: Expense;
  public readonly payment?: Payment;

  public static associate() {
    ExpenseSettlement.belongsTo(Expense, {
      foreignKey: 'expense_id',
      as: 'expense',
      onDelete: 'CASCADE'
    });

    ExpenseSettlement.belongsTo(Payment, {
      foreignKey: 'payment_id',
      as: 'payment',
      onDelete: 'SET NULL'
    });
  }
}

ExpenseSettlement.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    expense_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'kisaan_expenses',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    payment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'kisaan_payments',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    settled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'ExpenseSettlement',
    tableName: 'expense_settlements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['expense_id'] },
      { fields: ['payment_id'] },
      { fields: ['settled_at'] }
    ]
  }
);

export default ExpenseSettlement;