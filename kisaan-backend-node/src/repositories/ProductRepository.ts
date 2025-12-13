import { BaseRepository } from './BaseRepository';
import { Product } from '../models/product';
import { ModelStatic } from 'sequelize';
import { ProductEntity } from '../entities/ProductEntity';

import { Op } from 'sequelize';

/**
 * Product Repository Implementation
 */
export class ProductRepository extends BaseRepository<Product, ProductEntity> {
  protected model: ModelStatic<Product> = Product;
  protected entityName = 'Product';

  /**
   * Convert database model to domain entity
   */
  protected toDomainEntity(model: Product): ProductEntity {
    return new ProductEntity({
      id: model.id,
      name: model.name,
      category_id: model.category_id ?? undefined,
      description: model.description ?? null,
      unit: typeof model.unit === 'string' ? model.unit : undefined,
    });
  }

  /**
   * Convert domain entity to database model data
   */
  protected toModelData(entity: Partial<ProductEntity>): Record<string, unknown> {
    const rawName = entity.name || '';
    const normalized = rawName.trim().toLowerCase();
    if (!normalized) {
      throw new Error('Product name cannot be empty');
    }
    return {
      name: normalized,
      description: entity.description,
      category_id: entity.category_id,
      unit: entity.unit
    };
  }

  /**
   * Find products by category
   */
  async findByCategory(categoryId: number): Promise<ProductEntity[]> {
    const models = await this.model.findAll({
      where: { category_id: categoryId }
    });

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find active products
   */
  async findActive(): Promise<ProductEntity[]> {
    // Product status deprecated; return all products (caller can filter via assignments)
    return this.findAll();
  }

  /**
   * Search products by name
   */
  async searchByName(searchTerm: string): Promise<ProductEntity[]> {
    const models = await this.model.findAll({
      where: {
        name: {
          [Op.iLike]: `%${searchTerm}%`
        }
      }
    });

    return models.map((model) => this.toDomainEntity(model));
  }
}