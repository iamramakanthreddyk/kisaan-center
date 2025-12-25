
import { Request, Response } from 'express';
// import { Shop } from '../models/shop';
// import { sequelize } from '../models/index';
import { ShopService } from '../services/shopService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { success, failureCode, created, standardDelete } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
// import { logger } from '../shared/logging/logger';
import { parseId } from '../shared/utils/parse';

// Returns all users with role 'owner' who do not have a shop assigned
export class ShopController {
  private shopService: ShopService;

  constructor() {
    this.shopService = new ShopService();
  }
  async getAvailableOwners(req: Request, res: Response) {
    try {
      const owners = await this.shopService.getAvailableOwners();
      return success(res, owners, { message: 'Available owners retrieved', meta: { count: owners.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:availableOwners failed');
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, 500, ErrorCodes.GET_AVAILABLE_OWNERS_FAILED, undefined, message || 'Failed to fetch available owners');
    }
  }

  async createShop(req: AuthenticatedRequest, res: Response) {
    try {
  const shop = await this.shopService.createShop(req.body, (req as AuthenticatedRequest).user);

      return created(res, shop, { message: 'Shop created successfully' });
    } catch (error: unknown) {
      // Attach diagnostic context if DatabaseError provided it
      type ErrorWithContext = { context?: { diagnostic?: unknown } | unknown; message?: string; status?: number };
      let details: unknown = undefined;
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error !== null) {
        const e = error as ErrorWithContext;
        if (e.context) {
          // prefer structured diagnostic if present
          if (typeof e.context === 'object' && e.context !== null && 'diagnostic' in (e.context as Record<string, unknown>)) {
            details = (e.context as { diagnostic?: unknown }).diagnostic;
          } else {
            details = e.context;
          }
        }
        if ('message' in e) {
          message = e.message;
        }
        if ('status' in e) {
          status = e.status;
        }
      }
      req.log?.error({ err: error, diagnostic: details }, 'shop:create failed');
      if (status) {
        return failureCode(res, status, ErrorCodes.CREATE_SHOP_FAILED, details, message);
      }
      return failureCode(res, 500, ErrorCodes.CREATE_SHOP_FAILED, details, message || 'Failed to create shop');
    }
  }



  async getShops(req: AuthenticatedRequest, res: Response) {
    try {
  const shops = await this.shopService.getAllShops(undefined, (req as AuthenticatedRequest).user);
      return success(res, shops, { message: 'Shops retrieved successfully', meta: { count: shops.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:list failed');
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error) {
        if ('message' in error) {
          message = (error as { message?: string }).message;
        }
        if ('status' in error) {
          status = (error as { status?: number }).status;
        }
      }
      if (status) {
        return failureCode(res, status, ErrorCodes.GET_SHOPS_FAILED, undefined, message);
      }
      return failureCode(res, 500, ErrorCodes.GET_SHOPS_FAILED, undefined, message || 'Failed to fetch shops');
    }
  }

  async getShopById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const shopId = parseId(id, 'shop id');
  const shop = await this.shopService.getShopById(shopId, (req as AuthenticatedRequest).user);
      
      if (!shop) {
        return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND_ERROR, undefined, 'Shop not found');
      }
      return success(res, shop, { message: 'Shop retrieved successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:get failed');
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error) {
        if ('message' in error) {
          message = (error as { message?: string }).message;
        }
        if ('status' in error) {
          status = (error as { status?: number }).status;
        }
      }
      if (status) {
        return failureCode(res, status, ErrorCodes.GET_SHOP_FAILED, undefined, message);
      }
      return failureCode(res, 500, ErrorCodes.GET_SHOP_FAILED, undefined, message || 'Failed to fetch shop');
    }
  }

  async updateShop(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const shopId = parseId(id, 'shop id');
  const shop = await this.shopService.updateShop(shopId, req.body, (req as AuthenticatedRequest).user);
      if (!shop) {
        return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND_ERROR, undefined, 'Shop not found');
      }
      return success(res, shop, { message: 'Shop updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:update failed');
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error) {
        if ('message' in error) {
          message = (error as { message?: string }).message;
        }
        if ('status' in error) {
          status = (error as { status?: number }).status;
        }
      }
      if (status) {
        return failureCode(res, status, ErrorCodes.UPDATE_SHOP_FAILED, undefined, message);
      }
      return failureCode(res, 500, ErrorCodes.UPDATE_SHOP_FAILED, undefined, message || 'Failed to update shop');
    }
  }

  async deleteShop(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const shopId = parseId(id, 'shop id');
  const deleted = await this.shopService.deleteShop(shopId, (req as AuthenticatedRequest).user);
      if (!deleted) {
        return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND_ERROR, undefined, 'Shop not found');
      }
  return standardDelete(res, shopId, 'shop');
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:delete failed');
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error) {
        if ('message' in error) {
          message = (error as { message?: string }).message;
        }
        if ('status' in error) {
          status = (error as { status?: number }).status;
        }
      }
      if (status) {
        return failureCode(res, status, ErrorCodes.DELETE_SHOP_FAILED, undefined, message);
      }
      return failureCode(res, 500, ErrorCodes.DELETE_SHOP_FAILED, undefined, message || 'Failed to delete shop');
    }
  }

  async updateCommissionRate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { commission_rate } = req.body;
      
      if (!commission_rate || commission_rate < 0 || commission_rate > 100) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, undefined, 'Commission rate must be between 0 and 100');
      }

      const shopId = parseId(id, 'shop id');
      
      // Update the shop's commission rate
  const shop = await this.shopService.updateShop(shopId, { commission_rate }, (req as AuthenticatedRequest).user);
      if (!shop) {
        return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND_ERROR, undefined, 'Shop not found');
      }

      return success(res, shop, { message: 'Commission rate updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop:updateCommissionRate failed');
      let message: string | undefined = undefined;
      let status: number | undefined = undefined;
      if (typeof error === 'object' && error) {
        if ('message' in error) {
          message = (error as { message?: string }).message;
        }
        if ('status' in error) {
          status = (error as { status?: number }).status;
        }
      }
      if (status) {
        return failureCode(res, status, ErrorCodes.UPDATE_SHOP_FAILED, undefined, message);
      }
      return failureCode(res, 500, ErrorCodes.UPDATE_SHOP_FAILED, undefined, message || 'Failed to update commission rate');
    }
  }
}
