import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TransactionSettlementAttributes {
  id: number;
  transaction_id: number;
  settlement_type: 'PAYMENT' | 'EXPENSE_OFFSET' | 'CREDIT_OFFSET' | 'ADJUSTMENT';
  payment_id?: number | null;
  expense_id?: number | null;
  credit_id?: number | null;
  amount: number;
  settled_date: Date;
  notes?: string | null;
  created_by?: number | null;
  created_at: Date;
}

export interface TransactionSettlementCreationAttributes 
  extends Optional<TransactionSettlementAttributes, 'id' | 'payment_id' | 'expense_id' | 'credit_id' | 'notes' | 'created_by' | 'created_at'> {}

export class TransactionSettlement 
  extends Model<TransactionSettlementAttributes, TransactionSettlementCreationAttributes> 
  implements TransactionSettlementAttributes {
  
  public id!: number;
  public transaction_id!: number;
  public settlement_type!: 'PAYMENT' | 'EXPENSE_OFFSET' | 'CREDIT_OFFSET' | 'ADJUSTMENT';
  public payment_id?: number | null;
  public expense_id?: number | null;
  public credit_id?: number | null;
  public amount!: number;
  public settled_date!: Date;
  public notes?: string | null;
  public created_by?: number | null;
  public readonly created_at!: Date;
}

TransactionSettlement.init(
  {
    id: { 
      type: DataTypes.BIGINT, 
      autoIncrement: true, 
      primaryKey: true 
    },
    transaction_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false, 
      references: { model: 'kisaan_transactions', key: 'id' },
      onDelete: 'CASCADE'
    },
    settlement_type: { 
      type: DataTypes.STRING(50), 
      allowNull: false, 
      validate: { 
        isIn: [['PAYMENT', 'EXPENSE_OFFSET', 'CREDIT_OFFSET', 'ADJUSTMENT']] 
      },
      comment: 'Type of settlement: payment, expense offset, credit offset, or manual adjustment'
    },
    payment_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_payments', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Reference to payment if settlement_type is PAYMENT'
    },
    expense_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_expenses', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Reference to expense if settlement_type is EXPENSE_OFFSET'
    },
    credit_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_transaction_ledger', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Reference to ledger entry if settlement_type is CREDIT_OFFSET'
    },
    amount: { 
      type: DataTypes.DECIMAL(12,2), 
      allowNull: false, 
      validate: { min: 0 },
      comment: 'Amount settled in this event'
    },
    settled_date: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW,
      comment: 'Date when settlement occurred'
    },
    notes: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Additional notes about this settlement'
    },
    created_by: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_users', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'User who created this settlement record'
    },
    created_at: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    }
  },
  {
    sequelize,
    tableName: 'kisaan_transaction_settlements',
    timestamps: false,
    indexes: [
      { fields: ['transaction_id'], name: 'idx_settlement_transaction' },
      { fields: ['payment_id'], name: 'idx_settlement_payment' },
      { fields: ['expense_id'], name: 'idx_settlement_expense' },
      { fields: ['settlement_type'], name: 'idx_settlement_type' },
      { fields: ['settled_date'], name: 'idx_settlement_date' }
    ]
  }
);

export default TransactionSettlement;
