import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { UserRole, UserStatus } from '../shared/enums';

// Re-export for backward compatibility
export { UserRole, UserStatus };

export interface UserAttributes {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  shop_id?: number | null;
  email?: string | null;
  firstname?: string | null;
  contact?: string | null;
  balance: number;
  status?: UserStatus | null;
  cumulative_value?: number | null;
  created_by?: number | null;
  custom_commission_rate?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'shop_id' | 'email' | 'created_by' | 'created_at' | 'updated_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public password!: string;
  public role!: UserRole;
  public shop_id!: number | null;
  public email!: string | null;
  public firstname!: string | null;
  public contact!: string | null;
  public balance!: number;
  public status!: UserStatus | null;
  public cumulative_value!: number | null;
  public created_by!: number | null;
  public custom_commission_rate!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  // Add hooks for audit fields if custom logic is needed
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    shop_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'kisaan_shops', key: 'id' },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    balance: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: true,
      defaultValue: UserStatus.Active,
    },
    cumulative_value: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    custom_commission_rate: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
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
    tableName: 'kisaan_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Composite index for fast queries by shop, role, and status
      { fields: ['shop_id', 'role', 'status'] },
    ],
  }
);

// Only the new model definition should remain in this file. No legacy code below this line.


