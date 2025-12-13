
import { Router } from 'express';
import { ShopController } from '../controllers/shopController';
import * as shopProductsController from '../controllers/shopProductsController';
import * as transactionProductsController from '../controllers/transactionProductsController';
import { authenticateToken, requireRole, requireShopAccess } from '../middlewares/auth';
import { Request } from 'express';
import { testAuthBypass } from '../middleware/testAuthBypass';
import { getShopCategories } from '../controllers/shopCategoryController';

export const shopRoutes = Router();
const shopController = new ShopController();


// Test bypass first so it can inject a mock user when no Authorization header in tests
shopRoutes.use(testAuthBypass);
// Enable authentication for all shop routes (after potential test injection)
shopRoutes.use(authenticateToken);


// Owner-related routes
shopRoutes.get('/available-owners', shopController.getAvailableOwners.bind(shopController));


// Shop CRUD routes
shopRoutes.get('/', shopController.getShops.bind(shopController));
shopRoutes.get('/:id', shopController.getShopById.bind(shopController));

// Superadmin-only shop modification endpoints
shopRoutes.post('/', requireRole(['superadmin']), shopController.createShop.bind(shopController));
shopRoutes.put('/:id', requireRole(['superadmin']), shopController.updateShop.bind(shopController));
shopRoutes.delete('/:id', requireRole(['superadmin']), shopController.deleteShop.bind(shopController));

// Owner can update their own shop's commission rate
shopRoutes.patch('/:id/commission-rate', 
  requireShopAccess((req: Request) => parseInt(req.params.id)), 
  shopController.updateCommissionRate.bind(shopController)
);

// Shop-Product mapping routes
shopRoutes.get('/:id/products', 
  shopProductsController.getShopProducts
);
shopRoutes.get('/:id/available-products', 
  shopProductsController.getAvailableProductsForShop
);
shopRoutes.post('/:shopId/products/:productId', 
  requireShopAccess((req: Request) => parseInt(req.params.shopId)), 
  shopProductsController.assignProductToShop
);
shopRoutes.delete('/:shopId/products/:productId', 
  requireShopAccess((req: Request) => parseInt(req.params.shopId)), 
  shopProductsController.removeProductFromShop
);
shopRoutes.patch('/:shopId/products/:productId', 
  requireShopAccess((req: Request) => parseInt(req.params.shopId)), 
  shopProductsController.toggleProductActiveStatus
);

// Enhanced product routes for owners and transactions
shopRoutes.get('/:shopId/assignable-products', 
  requireShopAccess((req: Request) => parseInt(req.params.shopId)), 
  transactionProductsController.getOwnerAssignableProducts
);
shopRoutes.get('/:shopId/transaction-products', 
  requireShopAccess((req: Request) => parseInt(req.params.shopId)), 
  transactionProductsController.getTransactionProducts
);

// Shop-Category routes
shopRoutes.get('/:id/categories', getShopCategories);

// Add route logging middleware (at the end)
import type { Logger } from 'pino';
shopRoutes.use((req, _res, next) => {
  (req as typeof req & { log?: Logger }).log?.info({ path: req.path }, 'shop route hit');
  next();
});
