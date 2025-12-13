
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Product } from './product';
import { Shop } from './shop';

export interface ShopProductsAttributes {
  id: number;
  shop_id: number;
  product_id: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ShopProductsCreationAttributes extends Optional<ShopProductsAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class ShopProducts extends Model<ShopProductsAttributes, ShopProductsCreationAttributes> implements ShopProductsAttributes {
  public id!: number;
  public shop_id!: number;
  public product_id!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ShopProducts.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    shop_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'kisaan_shops', key: 'id' },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'kisaan_products', key: 'id' },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'kisaan_shop_products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

ShopProducts.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ShopProducts.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });


