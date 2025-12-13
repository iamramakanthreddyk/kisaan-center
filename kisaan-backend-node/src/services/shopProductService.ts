import { ShopProductRepository } from '../repositories/ShopProductRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { ShopRepository } from '../repositories/ShopRepository';
import { ValidationError, NotFoundError } from '../shared/utils/errors';

export class ShopProductService {
  private repo: ShopProductRepository;
  private productRepo: ProductRepository;
  private shopRepo: ShopRepository;
  constructor() {
    this.repo = new ShopProductRepository();
    this.productRepo = new ProductRepository();
    this.shopRepo = new ShopRepository();
  }

  async list(shopId: number) {
    if (!shopId) throw new ValidationError('shopId required');
    return this.repo.listByShop(shopId);
  }

  async assign(shopId: number, productId: number) {
    if (!shopId || !productId) throw new ValidationError('shopId & productId required');
  const shop = await this.shopRepo.findById(shopId);
    if (!shop) throw new NotFoundError('Shop not found');
  const prod = await this.productRepo.findById(productId);
    if (!prod) throw new NotFoundError('Product not found');
    return this.repo.create({ shop_id: shopId, product_id: productId, is_active: true });
  }

  async deactivate(shopProductId: number) {
    if (!shopProductId) throw new ValidationError('id required');
  const existing = await this.repo.findById(shopProductId);
    if (!existing) throw new NotFoundError('Record not found');
    return this.repo.update(existing.id!, { ...existing, is_active: false });
  }
}
