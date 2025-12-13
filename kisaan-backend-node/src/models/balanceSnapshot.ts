import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BalanceSnapshotAttributes {
  id: number;
  user_id: number;
  balance_type: 'farmer' | 'buyer';
  previous_balance: number;
  amount_change: number;
  new_balance: number;
  transaction_type: string;
  reference_id?: number;
  reference_type?: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface BalanceSnapshotCreationAttributes extends Optional<BalanceSnapshotAttributes, 'id' | 'previous_balance' | 'reference_id' | 'reference_type' | 'description' | 'created_at' | 'updated_at'> {}

class BalanceSnapshot extends Model<BalanceSnapshotAttributes, BalanceSnapshotCreationAttributes>
  implements BalanceSnapshotAttributes {
  public id!: number;
  public user_id!: number;
  public balance_type!: 'farmer' | 'buyer';
  public previous_balance!: number;
  public amount_change!: number;
  public new_balance!: number;
  public transaction_type!: string;
  public reference_id?: number;
  public reference_type?: string;
  public description?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

BalanceSnapshot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    balance_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['farmer', 'buyer']]
      }
    },
    previous_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    amount_change: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    new_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    transaction_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    reference_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'BalanceSnapshot',
    tableName: 'kisaan_balance_snapshots',
    timestamps: true,
    underscored: true,
  }
);

export default BalanceSnapshot;
