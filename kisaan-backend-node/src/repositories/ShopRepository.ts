import { BaseRepository } from './BaseRepository';
import { Shop } from '../models/shop';
import { ModelStatic } from 'sequelize';
import { ShopEntity } from '../entities/ShopEntity';

/**
 * Shop Repository Implementation
 */
export class ShopRepository extends BaseRepository<Shop, ShopEntity> {
  protected model: ModelStatic<Shop> = Shop;
  protected entityName = 'Shop';

  /**
   * Convert database model to domain entity
   */
  protected toDomainEntity(model: Shop): ShopEntity {
    // If Shop type does not have these fields, extend the type or use type assertion
    const shopWithExtras = model as Shop & {
      location?: string | null;
      email?: string | null;
      commission_rate?: number | string | null;
      settings?: unknown;
    };
    return new ShopEntity({
      id: model.id,
      name: model.name,
      owner_id: model.owner_id,
      plan_id: model.plan_id,
      location: shopWithExtras.location ?? undefined,
      address: model.address,
      contact: model.contact,
      email: shopWithExtras.email ?? undefined,
      commission_rate: shopWithExtras.commission_rate ? Number(shopWithExtras.commission_rate) : 0,
      settings: shopWithExtras.settings ?? undefined,
      status: model.status,
    });
  }

  /**
   * Convert domain entity to database model data
   */
  protected toModelData(entity: Partial<ShopEntity>): Record<string, unknown> {
    return {
      name: entity.name,
      owner_id: entity.owner_id,
      plan_id: entity.plan_id,
      location: entity.location,
      address: entity.address,
      contact: entity.contact,
      email: entity.email,
      commission_rate: entity.commission_rate,
      settings: entity.settings,
      status: entity.status,
    };
  }

  /**
   * Find shops by owner
   */
  async findByOwner(ownerId: number): Promise<ShopEntity[]> {
    const models = await this.model.findAll({
      where: { owner_id: ownerId }
    });

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find active shops
   */
  async findActive(): Promise<ShopEntity[]> {
    const models = await this.model.findAll({
      where: { status: 'active' }
    });

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find shops by plan
   */
  async findByPlan(planId: number): Promise<ShopEntity[]> {
    const models = await this.model.findAll({
      where: { plan_id: planId }
    });

    return models.map((model) => this.toDomainEntity(model));
  }
}