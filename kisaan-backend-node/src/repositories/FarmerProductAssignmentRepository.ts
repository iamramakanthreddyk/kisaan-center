import { BaseRepository } from './BaseRepository';
import { FarmerProductAssignment } from '../models/farmerProductAssignment';
import { ModelStatic } from 'sequelize';
import { Product } from '../models/product';

export interface FarmerProductAssignmentEntity {
  id?: number;
  farmer_id: number;
  product_id: number;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
    product_name?: string;
    product_category_id?: number;
}

export class FarmerProductAssignmentRepository extends BaseRepository<FarmerProductAssignment, FarmerProductAssignmentEntity> {
  protected model: ModelStatic<FarmerProductAssignment> = FarmerProductAssignment;
  protected entityName = 'FarmerProductAssignment';

  protected toDomainEntity(model: FarmerProductAssignment): FarmerProductAssignmentEntity {
    return { ...model.get() } as FarmerProductAssignmentEntity;
  }

  protected toModelData(entity: FarmerProductAssignmentEntity): Record<string, unknown> {
    return { ...entity };
  }

  async findByFarmer(farmerId: number): Promise<FarmerProductAssignmentEntity[]> {
    try {
      const models = await this.model.findAll({
        where: { farmer_id: farmerId },
        include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'category_id'] }]
      });
      return models.map(m => {
        const entity = this.toDomainEntity(m);
        // Attach product details if available
        if (m.Product) {
          entity.product_name = m.Product.name;
          entity.product_category_id = m.Product.category_id;
        }
        return entity;
      });
    } catch (err) {
      // Graceful fallback if the farmer_product_assignments table does not exist yet.
      const msg = (err as { message?: string })?.message || '';
      const code = (err as { original?: { code?: string }, parent?: { code?: string } })?.original?.code || (err as { parent?: { code?: string } })?.parent?.code;
      if (msg.includes('farmer_product_assignments') || code === '42P01') {
        if (!(global as Record<string, unknown>).__FARMER_ASSIGN_TABLE_MISSING_WARNED) {
          (global as Record<string, unknown>).__FARMER_ASSIGN_TABLE_MISSING_WARNED = true;
          console.warn('[farmerProductRepo] farmer_product_assignments table missing  proceeding with empty assignments fallback');
        }
        return [];
      }
      throw err;
    }
  }

  async findDefault(farmerId: number): Promise<FarmerProductAssignmentEntity | null> {
    const model = await this.model.findOne({ where: { farmer_id: farmerId, is_default: true } });
    return model ? this.toDomainEntity(model) : null;
  }
}
