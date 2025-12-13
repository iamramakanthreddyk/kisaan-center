import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PlanUsageAttributes {
  id: number;
  shop_id: number;
  plan_id: number;
  current_farmers: number;
  current_buyers: number;
  current_transactions: number;
  period_start: Date;
  period_end: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface PlanUsageCreationAttributes extends Optional<PlanUsageAttributes, 'id' | 'current_farmers' | 'current_buyers' | 'current_transactions' | 'created_at' | 'updated_at'> {}

export class PlanUsage extends Model<PlanUsageAttributes, PlanUsageCreationAttributes> implements PlanUsageAttributes {
  public id!: number;
  public shop_id!: number;
  public plan_id!: number;
  public current_farmers!: number;
  public current_buyers!: number;
  public current_transactions!: number;
  public period_start!: Date;
  public period_end!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PlanUsage.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    shop_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_shops', key: 'id' } },
    plan_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_plans', key: 'id' } },
    current_farmers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    current_buyers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    current_transactions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    period_start: { type: DataTypes.DATE, allowNull: false },
    period_end: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'kisaan_plan_usage',
    timestamps: true,
    indexes: [
      { fields: ['shop_id'] },
      { fields: ['plan_id'] },
      { fields: ['period_start', 'period_end'] }
    ]
  }
);