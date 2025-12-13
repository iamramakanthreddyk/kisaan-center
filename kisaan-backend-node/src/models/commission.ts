import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CommissionAttributes {
  id: number;
  shop_id: number;
  rate: number;
  type: 'percentage' | 'fixed';
  created_at?: Date;
  updated_at?: Date;
}

interface CommissionCreationAttributes extends Optional<CommissionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Commission extends Model<CommissionAttributes, CommissionCreationAttributes> implements CommissionAttributes {
  public id!: number;
  public shop_id!: number;
  public rate!: number;
  public type!: 'percentage' | 'fixed';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Commission.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    shop_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_shops', key: 'id' } },
    rate: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false, defaultValue: 'percentage' }
    // timestamps handled automatically; fields mapped below
  },
  {
    sequelize,
    tableName: 'kisaan_commissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['shop_id'] }
    ]
  }
);