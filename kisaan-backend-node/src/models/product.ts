import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProductAttributes {
  id: number;
  name: string;
  category_id: number; // enforce category
  description?: string | null;
  unit?: string | null;
  record_status?: string | null; // alternate status tracking
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductCreationAttributes extends Optional<ProductAttributes,
  'id' | 'description' | 'unit' | 'record_status' | 'created_at' | 'updated_at'> {}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public category_id!: number;
  public description?: string | null;
  public unit?: string | null;
  public record_status?: string | null;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;
}

Product.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_categories', key: 'id' } },
  description: { type: DataTypes.TEXT, allowNull: true },
  unit: { type: DataTypes.STRING(32), allowNull: true },
  record_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'kisaan_products',
  timestamps: false, // explicit columns handled manually
  indexes: [
    { fields: ['category_id'] },
    { fields: ['name', 'category_id'], unique: true }
  ]
});


