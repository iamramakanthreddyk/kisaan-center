import express, { Request, Response } from 'express';
import { FarmerProductService } from '../services/farmerProductService';
import { ControllerUtils, ResponseUtils } from '../utils/routeUtils';

const router = express.Router();
const service = new FarmerProductService();

// GET /farmers/:farmerId/products
router.get('/farmers/:farmerId/products', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const farmerId = Number(req.params.farmerId);
  const data = await service.listFarmerProducts(farmerId);
  ResponseUtils.success(res, data);
}));

// POST /farmers/:farmerId/products  { product_id, make_default? }
router.post('/farmers/:farmerId/products', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const farmerId = Number(req.params.farmerId);
  const { product_id, make_default } = req.body || {};
  const assignment = await service.assignProduct(farmerId, Number(product_id), make_default);
  res.status(201).json({ success: true, data: assignment });
}));

// PATCH /farmers/:farmerId/products/:productId/default
router.patch('/farmers/:farmerId/products/:productId/default', ControllerUtils.asyncHandler(async (req: Request, res: Response) => {
  const farmerId = Number(req.params.farmerId);
  const productId = Number(req.params.productId);
  const def = await service.setDefault(farmerId, productId);
  ResponseUtils.success(res, def);
}));

export default router;
