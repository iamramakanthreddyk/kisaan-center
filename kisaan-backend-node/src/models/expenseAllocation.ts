import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ExpenseAllocationAttributes {
  id: number;
  expense_id: number;
  allocation_type: 'TRANSACTION_OFFSET' | 'BALANCE_SETTLEMENT' | 'ADVANCE_PAYMENT';
  transaction_id?: number | null;
  transaction_settlement_id?: number | null;
  allocated_amount: number;
  allocation_date: Date;
  notes?: string | null;
  created_by?: number | null;
  created_at: Date;
}

export interface ExpenseAllocationCreationAttributes 
  extends Optional<ExpenseAllocationAttributes, 'id' | 'transaction_id' | 'transaction_settlement_id' | 'notes' | 'created_by' | 'created_at'> {}

export class ExpenseAllocation 
  extends Model<ExpenseAllocationAttributes, ExpenseAllocationCreationAttributes> 
  implements ExpenseAllocationAttributes {
  
  public id!: number;
  public expense_id!: number;
  public allocation_type!: 'TRANSACTION_OFFSET' | 'BALANCE_SETTLEMENT' | 'ADVANCE_PAYMENT';
  public transaction_id?: number | null;
  public transaction_settlement_id?: number | null;
  public allocated_amount!: number;
  public allocation_date!: Date;
  public notes?: string | null;
  public created_by?: number | null;
  public readonly created_at!: Date;
}

ExpenseAllocation.init(
  {
    id: { 
      type: DataTypes.BIGINT, 
      autoIncrement: true, 
      primaryKey: true 
    },
    expense_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false, 
      references: { model: 'kisaan_expenses', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Reference to the expense being allocated'
    },
    allocation_type: { 
      type: DataTypes.STRING(50), 
      allowNull: false, 
      validate: { 
        isIn: [['TRANSACTION_OFFSET', 'BALANCE_SETTLEMENT', 'ADVANCE_PAYMENT']] 
      },
      comment: 'How the expense is allocated: offset against transaction, balance settlement, or advance'
    },
    transaction_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_transactions', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Transaction this expense is allocated against (for TRANSACTION_OFFSET type)'
    },
    transaction_settlement_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_transaction_settlements', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Link to settlement record for complete chain'
    },
    allocated_amount: { 
      type: DataTypes.DECIMAL(12,2), 
      allowNull: false, 
      validate: { min: 0 },
      comment: 'Amount of expense allocated in this event'
    },
    allocation_date: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW,
      comment: 'Date when allocation occurred'
    },
    notes: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Additional notes about this allocation'
    },
    created_by: { 
      type: DataTypes.BIGINT, 
      allowNull: true, 
      references: { model: 'kisaan_users', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'User who created this allocation record'
    },
    created_at: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    }
  },
  {
    sequelize,
    tableName: 'kisaan_expense_allocations',
    timestamps: false,
    indexes: [
      { fields: ['expense_id'], name: 'idx_allocation_expense' },
      { fields: ['transaction_id'], name: 'idx_allocation_transaction' },
      { fields: ['allocation_type'], name: 'idx_allocation_type' },
      { fields: ['allocation_date'], name: 'idx_allocation_date' }
    ]
  }
);

export default ExpenseAllocation;
