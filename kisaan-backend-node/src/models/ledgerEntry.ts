import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LedgerEntryAttributes {
  id: number;
  user_id: number;
  shop_id: number;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  type: 'TRANSACTION' | 'PAYMENT' | 'ADVANCE' | 'EXPENSE' | 'EXPENSE_SETTLED' | 'ADJUSTMENT' | 'REFUND';
  reference_type?: string;
  reference_id?: number;
  description?: string;
  created_at: Date;
  created_by?: number;
}

export interface LedgerEntryCreationAttributes extends Optional<LedgerEntryAttributes, 'id' | 'created_at'> {}

export class LedgerEntry extends Model<LedgerEntryAttributes, LedgerEntryCreationAttributes> implements LedgerEntryAttributes {
  public id!: number;
  public user_id!: number;
  public shop_id!: number;
  public direction!: 'DEBIT' | 'CREDIT';
  public amount!: number;
  public type!: 'TRANSACTION' | 'PAYMENT' | 'ADVANCE' | 'EXPENSE' | 'EXPENSE_SETTLED' | 'ADJUSTMENT' | 'REFUND';
  public reference_type?: string;
  public reference_id?: number;
  public description?: string;
  public created_at!: Date;
  public created_by?: number;
}

LedgerEntry.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    direction: {
      type: DataTypes.ENUM('DEBIT', 'CREDIT'),
      allowNull: false
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: {
      type: DataTypes.ENUM('TRANSACTION', 'PAYMENT', 'ADVANCE', 'EXPENSE', 'EXPENSE_SETTLED', 'ADJUSTMENT', 'REFUND'),
      allowNull: false
    },
    reference_type: { type: DataTypes.STRING(50) },
    reference_id: { type: DataTypes.BIGINT },
    description: { type: DataTypes.TEXT },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_by: { type: DataTypes.BIGINT }
  },
  {
    sequelize,
    modelName: 'LedgerEntry',
    tableName: 'kisaan_ledger_entries',
    timestamps: false,
    indexes: [
      { fields: ['user_id', 'shop_id'] },
      { fields: ['created_at'] },
      { fields: ['type'] },
      { fields: ['reference_type', 'reference_id'] }
    ]
  }
);

export default LedgerEntry;
