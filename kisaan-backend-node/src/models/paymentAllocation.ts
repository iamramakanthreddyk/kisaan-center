import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PaymentAllocationAttributes {
  id: number;
  payment_id: number;
  transaction_id: number;
  allocated_amount: number;
  created_at?: Date;
  updated_at?: Date;
}

interface PaymentAllocationCreationAttributes extends Optional<PaymentAllocationAttributes, 'id' | 'created_at' | 'updated_at'> {}

class PaymentAllocation extends Model<PaymentAllocationAttributes, PaymentAllocationCreationAttributes> implements PaymentAllocationAttributes {
  public id!: number;
  public payment_id!: number;
  public transaction_id!: number;
  public allocated_amount!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PaymentAllocation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'kisaan_payments',
        key: 'id',
      },
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'kisaan_transactions',
        key: 'id',
      },
    },
    allocated_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
  tableName: 'kisaan_payment_allocations',
    timestamps: true,
    underscored: true,
  }
);

export { PaymentAllocation };
