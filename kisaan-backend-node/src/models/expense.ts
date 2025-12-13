import { DataTypes, Model, Optional, Transaction } from 'sequelize';
import sequelize from '../config/database';
import ExpenseSettlement from './expenseSettlement';
import { ExpenseStatus, ExpenseCategory } from '../shared/enums';

// Re-export for backward compatibility
export { ExpenseStatus, ExpenseCategory };

export interface ExpenseAttributes {
  id: number;
  shop_id?: number | null; // Made optional for standalone expenses
  user_id: number; // farmer or buyer
  amount: number;
  type: 'expense' | 'advance' | 'adjustment';
  description?: string;
  transaction_id?: number | null;
  status: ExpenseStatus;
  
  // Enhanced Standalone Expense Support (New)
  // expense_amount removed: use amount
  expense_date?: Date; // Specific date expense incurred
  category?: ExpenseCategory | null; // Categorize expenses
  ledger_entry_id?: number | null; // Link to transaction ledger
  created_by?: number | null; // User who created the expense
  deleted_at?: Date | null; // Soft delete support
  
  // Allocation tracking fields (added by migration 20251019_06)
  total_amount?: number; // Original expense amount (immutable)
  allocated_amount?: number; // Amount already allocated/offset
  remaining_amount?: number; // Amount not yet allocated
  allocation_status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  
  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'shop_id' | 'transaction_id' | 'expense_date' | 'category' | 'ledger_entry_id' | 'created_by' | 'deleted_at' | 'created_at' | 'updated_at'> {}

export class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
  public id!: number;
  public shop_id?: number | null;
  public user_id!: number;
  public amount!: number;
  public type!: 'expense' | 'advance' | 'adjustment';
  public description?: string;
  public transaction_id?: number | null;
  public status!: ExpenseStatus;
  
  // Enhanced Fields
  // expense_amount removed: use amount
  public expense_date?: Date;
  public category?: ExpenseCategory | null;
  public ledger_entry_id?: number | null;
  public created_by?: number | null;
  public deleted_at?: Date | null;
  
  // Allocation tracking fields
  public total_amount?: number;
  public allocated_amount?: number;
  public remaining_amount?: number;
  public allocation_status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association mixin
  public readonly settlements?: ExpenseSettlement[];

  // Instance method to get settled amount
  public async getSettledAmount(options?: { transaction?: Transaction }): Promise<number> {
    const settlements = await ExpenseSettlement.findAll({
      where: { expense_id: this.id },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      raw: true,
      transaction: options?.transaction
    });

    const result = settlements[0] as { total?: string | number } | undefined;
    return result?.total ? parseFloat(String(result.total)) : 0;
  }

  // Instance method to get remaining amount
  public async getRemainingAmount(options?: { transaction?: import('sequelize').Transaction }): Promise<number> {
    const settledAmount = await this.getSettledAmount(options);
    return Math.max(0, this.amount - settledAmount);
  }

  // Instance method to check if fully settled
  public async isFullySettled(options?: { transaction?: import('sequelize').Transaction }): Promise<boolean> {
    const remaining = await this.getRemainingAmount(options);
    return remaining <= 0;
  }
}

Expense.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: { type: DataTypes.ENUM('expense', 'advance', 'adjustment'), allowNull: false, defaultValue: 'expense' },
    description: { type: DataTypes.TEXT, allowNull: true },
    transaction_id: { type: DataTypes.BIGINT, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(ExpenseStatus)), allowNull: false, defaultValue: ExpenseStatus.Pending },
    
  // Enhanced standalone expense fields
  // expense_amount removed: use amount
    expense_date: { type: DataTypes.DATE, allowNull: true },
    category: { type: DataTypes.ENUM(...Object.values(ExpenseCategory)), allowNull: true },
    ledger_entry_id: { type: DataTypes.BIGINT, allowNull: true },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    
    // Allocation tracking fields (added by migration 20251019_06)
    total_amount: { type: DataTypes.DECIMAL(12,2), allowNull: true },
    allocated_amount: { type: DataTypes.DECIMAL(12,2), allowNull: true, defaultValue: 0, validate: { min: 0 } },
    remaining_amount: { type: DataTypes.DECIMAL(12,2), allowNull: true },
    allocation_status: { 
      type: DataTypes.STRING(50), 
      allowNull: true,
      defaultValue: 'UNALLOCATED',
      validate: { isIn: [['UNALLOCATED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED']] }
    },
    
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    tableName: 'kisaan_expenses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['shop_id', 'user_id', 'status'] }
    ]
  }
);

// Associations are defined in models/index.ts
// Expense.hasMany(ExpenseSettlement, {
//   foreignKey: 'expense_id',
//   as: 'settlements',
//   onDelete: 'CASCADE'
// });

// ExpenseSettlement.belongsTo(Expense, {
//   foreignKey: 'expense_id',
//   as: 'expense'
// });

export default Expense;
