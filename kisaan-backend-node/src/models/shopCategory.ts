import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ShopCategoryAttributes {
  id: number;
  shop_id: number;
  category_id: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ShopCategoryCreationAttributes extends Optional<ShopCategoryAttributes, 'id' | 'is_active' | 'created_at' | 'updated_at'> {}

export class ShopCategory extends Model<ShopCategoryAttributes, ShopCategoryCreationAttributes> implements ShopCategoryAttributes {
  public id!: number;
  public shop_id!: number;
  public category_id!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ShopCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    shop_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'kisaan_shops',
        key: 'id',
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'kisaan_categories',
        key: 'id',
      },
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
    tableName: 'kisaan_shop_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['shop_id'] },
      { fields: ['category_id'] },
      { fields: ['shop_id', 'category_id'], unique: true },
      { fields: ['is_active'] },
    ],
  }
);


