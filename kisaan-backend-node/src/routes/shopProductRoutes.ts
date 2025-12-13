
import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ShopProductService } from '../services/shopProductService';
import { ControllerUtils, ResponseUtils } from '../utils/routeUtils';
import { FarmerProductAssignmentRepository } from '../repositories/FarmerProductAssignmentRepository';

const router = express.Router();
const service = new ShopProductService();

// GET /shops/:shopId/assignable-products?farmerId=123
router.get('/shops/:shopId/assignable-products', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const shopId = Number(req.params.shopId);
  const farmerId = Number(req.query.farmerId);
  // Get user's shop from auth/session (use type casting for now)
  const userShop = typeof (req as AuthenticatedRequest).user?.shop_id !== 'undefined' ? Number((req as AuthenticatedRequest).user?.shop_id) : undefined;
  if (!shopId || !farmerId) return res.status(400).json({ success: false, message: 'shopId and farmerId required' });
  if (typeof userShop !== 'undefined' && shopId !== userShop) {
    return res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'You can only manage products for your own shop',
      details: { requestedShop: shopId, userShop }
    });
  }
  // Get all active shop products
  const allShopProducts = await service.list(shopId);
  const activeShopProducts = allShopProducts.filter(sp => sp.is_active);
  // Get all farmer assignments
  const farmerRepo = new FarmerProductAssignmentRepository();
  const assigned: Array<{ product_id: number }> = await farmerRepo.findByFarmer(farmerId);
  const assignedProductIds = new Set(assigned.map(a => a.product_id));
  // Only return shop products not assigned to farmer
  const assignable = activeShopProducts.filter(sp => !assignedProductIds.has(sp.product_id));
  res.json({ success: true, data: assignable });
}));

// GET /shops/:shopId/products
router.get('/shops/:shopId/products', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const shopId = Number(req.params.shopId);
  const data = await service.list(shopId);
  ResponseUtils.success(res, data);
}));

// POST /shops/:shopId/products { product_id }
router.post('/shops/:shopId/products', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const shopId = Number(req.params.shopId);
  const { product_id } = req.body || {};
  const sp = await service.assign(shopId, Number(product_id));
  res.status(201).json({ success: true, data: sp });
}));

// PATCH /shops/:shopId/products/:shopProductId/deactivate
router.patch('/shops/:shopId/products/:shopProductId/deactivate', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.shopProductId);
  const updated = await service.deactivate(id);
  ResponseUtils.success(res, updated);
}));

export default router;
