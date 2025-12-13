import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface FarmerProductAssignmentAttributes {
  id: number;
  farmer_id: number;
  product_id: number;
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type FarmerProductAssignmentCreation = Optional<FarmerProductAssignmentAttributes, 'id' | 'is_default' | 'created_at' | 'updated_at'>;

export class FarmerProductAssignment extends Model<FarmerProductAssignmentAttributes, FarmerProductAssignmentCreation> implements FarmerProductAssignmentAttributes {
  public Product?: import('./product').Product; // for eager loading
  public id!: number;
  public farmer_id!: number;
  public product_id!: number;
  public is_default!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

FarmerProductAssignment.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  farmer_id: { type: DataTypes.BIGINT, allowNull: false },
  product_id: { type: DataTypes.BIGINT, allowNull: false },
  is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'farmer_product_assignments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['farmer_id'] },
    { fields: ['product_id'] }
  ]
});

  // Add association for eager loading
  import { Product } from './product';
  FarmerProductAssignment.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
