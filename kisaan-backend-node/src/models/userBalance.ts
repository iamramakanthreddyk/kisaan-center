import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserBalanceAttributes {
  id: number;
  user_id: number;
  shop_id: number;
  balance: number;
  version: number;
  last_updated: Date;
}

export interface UserBalanceCreationAttributes extends Optional<UserBalanceAttributes, 'id' | 'last_updated' | 'version'> {}

export class UserBalance extends Model<UserBalanceAttributes, UserBalanceCreationAttributes> implements UserBalanceAttributes {
  public id!: number;
  public user_id!: number;
  public shop_id!: number;
  public balance!: number;
  public version!: number;
  public last_updated!: Date;
}

UserBalance.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'UserBalance',
    tableName: 'kisaan_user_balances',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'shop_id']
      }
    ]
  }
);

export default UserBalance;
