import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface FeatureAttributes {
  id: number;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  default_enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface FeatureCreationAttributes extends Optional<FeatureAttributes, 'id' | 'description' | 'created_at' | 'updated_at'> {}

export class Feature extends Model<FeatureAttributes, FeatureCreationAttributes> implements FeatureAttributes {
  public id!: number;
  public code!: string;
  public name!: string;
  public category!: string;
  public description!: string | null;
  public default_enabled!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

Feature.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category: { type: DataTypes.STRING(60), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  default_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'kisaan_features',
  timestamps: false
});

export interface PlanFeatureAttributes {
  plan_id: number;
  feature_code: string;
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class PlanFeature extends Model<PlanFeatureAttributes> implements PlanFeatureAttributes {
  public plan_id!: number; public feature_code!: string; public enabled!: boolean; public created_at!: Date; public updated_at!: Date;
}

PlanFeature.init({
  plan_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  feature_code: { type: DataTypes.STRING(100), allowNull: false, primaryKey: true },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'kisaan_plan_features',
  timestamps: false
});

export interface UserFeatureOverrideAttributes {
  user_id: number;
  feature_code: string;
  enabled: boolean; // forced value
  reason?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export class UserFeatureOverride extends Model<UserFeatureOverrideAttributes> implements UserFeatureOverrideAttributes {
  public user_id!: number; public feature_code!: string; public enabled!: boolean; public reason!: string | null; public created_at!: Date; public updated_at!: Date;
}

UserFeatureOverride.init({
  user_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true },
  feature_code: { type: DataTypes.STRING(100), allowNull: false, primaryKey: true },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'kisaan_user_feature_overrides',
  timestamps: false
});

export default Feature;