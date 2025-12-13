import { sequelize } from '../models/index';
import { FarmerProductAssignmentRepository } from '../repositories/FarmerProductAssignmentRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { ValidationError, NotFoundError } from '../shared/utils/errors';

export class FarmerProductService {
  private repo: FarmerProductAssignmentRepository;
  private productRepo: ProductRepository;
  constructor() {
    this.repo = new FarmerProductAssignmentRepository();
    this.productRepo = new ProductRepository();
  }

  async listFarmerProducts(farmerId: number) {
    if (!farmerId) throw new ValidationError('farmerId required');
    return this.repo.findByFarmer(farmerId);
  }

  async assignProduct(farmerId: number, productId: number, makeDefault?: boolean) {
    if (!farmerId || !productId) throw new ValidationError('farmerId & productId required');
    // Validate product exists
  const prod = await this.productRepo.findById(productId);
    if (!prod) throw new NotFoundError('Product not found');
    // Create assignment (idempotent handled by DB unique constraint)
    let assignment = await this.repo.create({ farmer_id: farmerId, product_id: productId, is_default: !!makeDefault });
    if (makeDefault) {
      // Clear previous default (direct SQL fallback approach)
      await sequelize.query('UPDATE farmer_product_assignments SET is_default = FALSE WHERE farmer_id = :fid AND id <> :aid', { replacements: { fid: farmerId, aid: assignment.id } });
      const updated = await this.repo.update(assignment.id!, { ...assignment, is_default: true });
      if (updated) {
        assignment = updated;
      }
    }
    return assignment;
  }

  async setDefault(farmerId: number, productId: number) {
    const assignments = await this.repo.findByFarmer(farmerId);
    const target = assignments.find(a => a.product_id === productId);
    if (!target) throw new NotFoundError('Assignment not found');
  await sequelize.query('UPDATE farmer_product_assignments SET is_default = (product_id = :pid) WHERE farmer_id = :fid', { replacements: { fid: farmerId, pid: productId } });
    return this.repo.findDefault(farmerId);
  }

  async getDefault(farmerId: number) {
    return this.repo.findDefault(farmerId);
  }
}
