import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PlanAttributes {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  billing_cycle?: string | null;
  monthly_price?: number | null;
  quarterly_price?: number | null;
  yearly_price?: number | null;
  max_farmers?: number | null;
  max_buyers?: number | null;
  max_transactions?: number | null;
  data_retention_months?: number | null;
  features: string; // JSON string of features array
  is_active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanCreationAttributes extends Optional<
  PlanAttributes,
  'id' | 'description' | 'features' | 'createdAt' | 'updatedAt'
> {}

export class Plan extends Model<PlanAttributes, PlanCreationAttributes> implements PlanAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public price!: number | null;
  public billing_cycle!: string | null;
  public monthly_price!: number | null;
  public quarterly_price!: number | null;
  public yearly_price!: number | null;
  public max_farmers!: number | null;
  public max_buyers!: number | null;
  public max_transactions!: number | null;
  public data_retention_months!: number | null;
  public features!: string;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}


Plan.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    billing_cycle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    monthly_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    quarterly_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    yearly_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    max_farmers: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_buyers: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_transactions: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data_retention_months: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    features: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'kisaan_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);


