import { BaseRepository } from './BaseRepository';
import { ShopProducts } from '../models/shopProducts';
import { ModelStatic } from 'sequelize';

export interface ShopProductEntity {
  id?: number;
  shop_id: number;
  product_id: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class ShopProductRepository extends BaseRepository<ShopProducts, ShopProductEntity> {
  protected model: ModelStatic<ShopProducts> = ShopProducts;
  protected entityName = 'ShopProduct';

  protected toDomainEntity(model: ShopProducts): ShopProductEntity {
    return { ...model.get() } as ShopProductEntity;
  }

  protected toModelData(entity: ShopProductEntity): Record<string, unknown> {
    return { ...entity };
  }

  async listByShop(shopId: number): Promise<ShopProductEntity[]> {
    const models = await this.model.findAll({ where: { shop_id: shopId } });
    return models.map(m => this.toDomainEntity(m));
  }
}
