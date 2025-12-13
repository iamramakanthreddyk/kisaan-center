

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { LEDGER_TYPES, LEDGER_TYPE_VALUES, LedgerType } from '../constants/ledgerTypes';
import { LEDGER_CATEGORIES, LEDGER_CATEGORY_VALUES, LedgerCategory } from '../constants/ledgerCategories';

export interface SimpleFarmerLedgerAttributes {
  id: number;
  shop_id: number;
  farmer_id: number;
  amount: number;
  type: LedgerType;
  category: LedgerCategory;
  notes?: string;
  created_at?: Date;

  created_by: number;
  commission_amount?: number;
  net_amount?: number;
}

export interface SimpleFarmerLedgerCreationAttributes extends Optional<SimpleFarmerLedgerAttributes, 'id' | 'created_at' | 'notes'> {}





export class SimpleFarmerLedger extends Model<SimpleFarmerLedgerAttributes, SimpleFarmerLedgerCreationAttributes> implements SimpleFarmerLedgerAttributes {
  public id!: number;
  public shop_id!: number;
  public farmer_id!: number;
  public amount!: number;
  public type!: LedgerType;
  public category!: LedgerCategory;
  public notes?: string;
  public created_at?: Date;
  public created_by!: number;
  public commission_amount?: number;
  public net_amount?: number;
}

SimpleFarmerLedger.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  shop_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  farmer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(...LEDGER_TYPE_VALUES),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(...LEDGER_CATEGORY_VALUES),
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  
  commission_amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  net_amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'kisaan_ledger',
  timestamps: false,
});
