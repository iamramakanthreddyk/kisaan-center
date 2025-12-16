import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LedgerEntryAttributes {
  id: number;
  shop_id: number;
  farmer_id: number;
  amount: number;
  commission_amount?: number;
  net_amount?: number;
  type: string;
  category: string;
  notes?: string;
  created_at: Date;
  created_by: number;
}

export interface LedgerEntryCreationAttributes extends Optional<LedgerEntryAttributes, 'id' | 'commission_amount' | 'net_amount' | 'notes'> {}

  public id!: number;
  public shop_id!: number;
  public farmer_id!: number;
  public amount!: number;
  public commission_amount?: number;
  public net_amount?: number;
  public type!: string;
  public category!: string;
  public notes?: string;
  public created_at!: Date;
  public created_by!: number;
}

LedgerEntry.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    farmer_id: { type: DataTypes.BIGINT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    commission_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    type: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    created_by: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    sequelize,
    modelName: 'LedgerEntry',
    tableName: 'kisaan_ledger',
    timestamps: false,
    indexes: [
      { fields: ['shop_id', 'farmer_id'] },
      { fields: ['created_at'] },
      { fields: ['type'] },
      { fields: ['category'] }
    ]
  }
);

export default LedgerEntry;
