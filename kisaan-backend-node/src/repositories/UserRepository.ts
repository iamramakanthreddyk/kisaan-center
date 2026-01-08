import { BaseRepository } from './BaseRepository';
// Import models index to ensure all models and associations are initialized
import '../models';
import { User } from '../models/user';
import { ModelStatic } from 'sequelize';
import { UserEntity } from '../entities/UserEntity';

/**
 * User Repository Implementation
 */
export class UserRepository extends BaseRepository<User, UserEntity> {
  protected model: ModelStatic<User>;
  protected entityName = 'User';

  constructor() {
    super();
    this.model = User;
  }

  /**
   * Convert database model to domain entity
   */
  protected toDomainEntity(model: User): UserEntity {
    return new UserEntity({
      id: model.id,
      username: model.username,
      password: model.password,
      email: model.email,
      role: model.role,
      shop_id: model.shop_id,
      firstname: model.firstname ?? '',
      contact: model.contact ?? '',
      balance: model.balance,
      status: model.status,
      cumulative_value: model.cumulative_value,
      created_at: model.created_at,
      updated_at: model.updated_at,
      created_by: model.created_by,
      custom_commission_rate: model.custom_commission_rate ?? null
    });
  }

  /**
   * Convert domain entity to database model data
   */
  protected toModelData(entity: Partial<UserEntity>): Record<string, unknown> {
    return {
      username: entity.username,
      password: entity.password,
      email: entity.email,
      role: entity.role,
      shop_id: entity.shop_id,
      firstname: entity.firstname,
      contact: entity.contact,
      balance: entity.balance,
      status: entity.status,
      cumulative_value: entity.cumulative_value,
      created_by: entity.created_by,
      custom_commission_rate: entity.custom_commission_rate
    };
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    const model = await this.model.findOne({
      where: { username }
    });

    return model ? this.toDomainEntity(model) : null;
  }

  /**
   * Find users by shop
   */
  async findByShop(shopId: number): Promise<UserEntity[]> {
    const models = await this.model.findAll({
      where: { shop_id: shopId }
    });
    return models.map((model: User) => this.toDomainEntity(model));
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<UserEntity[]> {
    const models = await this.model.findAll({
      where: { role }
    });

  return models.map((model: User) => this.toDomainEntity(model));
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string, excludeId?: number): Promise<boolean> {
  const where: Record<string, unknown> = { username };
    if (excludeId) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      where.id = { [require('sequelize').Op.ne]: excludeId };
    }

    const count = await this.model.count({ where });
    return count > 0;
  }

  /**
   * Find users by shop with pagination
   */
  async findByShopPaginated(shopId: number, page: number = 1, limit: number = 20): Promise<{ users: UserEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await this.model.findAndCountAll({
      where: { shop_id: shopId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      users: rows.map((model: User) => this.toDomainEntity(model)),
      total: count
    };
  }

  /**
   * Find all users with pagination and optional filters
   */
  async findAllPaginated(
    page: number = 1, 
    limit: number = 20, 
    filters?: { role?: string | string[]; shop_id?: number; status?: string }
  ): Promise<{ users: UserEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    
    if (filters?.role) {
      // Handle both single role and array of roles using Op.in
      if (Array.isArray(filters.role)) {
        const { Op } = require('sequelize');
        where.role = { [Op.in]: filters.role };
      } else {
        where.role = filters.role;
      }
    }
    if (filters?.shop_id) {
      where.shop_id = filters.shop_id;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      users: rows.map((model: User) => this.toDomainEntity(model)),
      total: count
    };
  }
}