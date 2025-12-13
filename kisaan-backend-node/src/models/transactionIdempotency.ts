import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TransactionIdempotencyAttributes {
  id: number;
  key: string;
  buyer_id: number;
  farmer_id: number;
  shop_id: number;
  total_amount: number;
  transaction_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface TransactionIdempotencyCreationAttributes extends Optional<TransactionIdempotencyAttributes, 'id' | 'transaction_id' | 'created_at' | 'updated_at'> {}

export class TransactionIdempotency extends Model<TransactionIdempotencyAttributes, TransactionIdempotencyCreationAttributes> implements TransactionIdempotencyAttributes {
  public id!: number;
  public key!: string;
  public buyer_id!: number;
  public farmer_id!: number;
  public shop_id!: number;
  public total_amount!: number;
  public transaction_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TransactionIdempotency.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  buyer_id: { type: DataTypes.BIGINT, allowNull: false },
  farmer_id: { type: DataTypes.BIGINT, allowNull: false },
  shop_id: { type: DataTypes.BIGINT, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  transaction_id: { type: DataTypes.BIGINT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'kisaan_transaction_idempotency',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['key'], unique: true },
    { fields: ['buyer_id'] },
    { fields: ['farmer_id'] },
    { fields: ['shop_id'] },
    { fields: ['transaction_id'] }
  ]
});

export default TransactionIdempotency;