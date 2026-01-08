import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserSessionAttributes {
  id: number;
  user_id: number;
  jti: string; // JWT ID for token invalidation
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface UserSessionCreationAttributes extends Optional<UserSessionAttributes, 'id' | 'device_info' | 'ip_address' | 'user_agent' | 'created_at'> {}

export class UserSession extends Model<UserSessionAttributes, UserSessionCreationAttributes> implements UserSessionAttributes {
  public id!: number;
  public user_id!: number;
  public jti!: string;
  public device_info?: string;
  public ip_address?: string;
  public user_agent?: string;
  public readonly created_at!: Date;
  public expires_at!: Date;
  public is_active!: boolean;
}

UserSession.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'kisaan_users', key: 'id' },
    },
    jti: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    device_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'kisaan_user_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['jti'] },
      { fields: ['expires_at'] },
      { fields: ['is_active'] },
    ],
  }
);

export default UserSession;