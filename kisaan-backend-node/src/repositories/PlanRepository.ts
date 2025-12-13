import { Op } from 'sequelize';
import { BaseRepository } from './BaseRepository';
import { Plan } from '../models/plan';
import { PlanEntity } from '../entities/PlanEntity';
import { ModelStatic } from 'sequelize';
// Simplified repository after plan model flattening

export class PlanRepository extends BaseRepository<Plan, PlanEntity> {
  protected model: ModelStatic<Plan> = Plan;
  protected entityName = 'Plan';

  protected toDomainEntity(model: Plan): PlanEntity {
    return new PlanEntity({
      id: model.id,
      name: model.name,
      description: model.description,
      features: model.features,
      created_at: model.createdAt,
      updated_at: model.updatedAt
    });
  }

  protected toModelData(entity: PlanEntity): Record<string, unknown> {
    return {
      name: entity.name,
      description: entity.description,
      features: Array.isArray(entity.features) ? JSON.stringify(entity.features) : entity.features
    };
  }
  // findActive / findByStatus removed (no status field in simplified model)

  async searchByName(searchTerm: string): Promise<PlanEntity[]> {
    const models = await this.model.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['name', 'ASC']]
    });
    return models.map(model => this.toDomainEntity(model));
  }

  // findByPriceRange removed (pricing fields removed)
}