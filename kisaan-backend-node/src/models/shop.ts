import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';


interface ShopAttributes {
  id: number;
  name: string;
  owner_id: number;
  plan_id?: number | null;
  location?: string | null;
  address: string | null;
  contact: string | null;
  email?: string | null;
  commission_rate?: number | null;
  settings?: Record<string, unknown> | null;
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

interface ShopCreationAttributes extends Optional<ShopAttributes, 'id' | 'plan_id' | 'created_at' | 'updated_at'> {}

export class Shop extends Model<ShopAttributes, ShopCreationAttributes> implements ShopAttributes {
  public id!: number;
  public name!: string;
  public owner_id!: number;
  public plan_id!: number | null;
  public location!: string | null;
  public address!: string | null;
  public contact!: string | null;
  public email!: string | null;
  public commission_rate!: number | null;
  public settings!: Record<string, unknown> | null;
  public status!: 'active' | 'inactive';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Shop.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'kisaan_users', key: 'id' },
    },
    plan_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'kisaan_plans', key: 'id' },
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    commission_rate: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    },
  },
  {
    sequelize,
    tableName: 'kisaan_shops',
    timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
    indexes: [
      { fields: ['owner_id'] },
      { fields: ['plan_id'] },
      { fields: ['status'] },
    ],
  }
);


