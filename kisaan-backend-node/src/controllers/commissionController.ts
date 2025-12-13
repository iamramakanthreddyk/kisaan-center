import { Request, Response } from 'express';
import { CommissionService } from '../services/commissionService';
import { CreateCommissionDTO, UpdateCommissionDTO } from '../dtos';
import { success, created, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { parseId } from '../shared/utils/parse';

export class CommissionController {
  private commissionService = new CommissionService();

  async createCommission(req: Request, res: Response) {
    try {
      const userId = (req as { user?: { id?: number } }).user?.id || 1;
      const commissionData: CreateCommissionDTO = req.body;
      if (!commissionData.shop_id || !commissionData.rate || !commissionData.type) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { required: ['shop_id', 'rate', 'type'] }, 'Missing required fields');
      }
      const commission = await this.commissionService.createCommission(commissionData, userId);
      return created(res, commission, { message: 'Commission created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'commission:create failed');
      const err = error as { statusCode?: number; message?: string };
      return failureCode(res, err.statusCode || 500, ErrorCodes.CREATE_COMMISSION_FAILED, undefined, err.message || 'Failed to create commission');
    }
  }

  async getAllCommissions(req: Request, res: Response) {
    try {
      const { shop_id } = req.query;
      const commissions = shop_id
        ? await this.commissionService.getCommissionsByShop(Number(shop_id))
        : await this.commissionService.getAllCommissions();
      return success(res, commissions, { message: 'Commissions retrieved', meta: { count: commissions.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'commission:list failed');
      const err = error as { statusCode?: number; message?: string };
      return failureCode(res, err.statusCode || 500, ErrorCodes.GET_COMMISSIONS_FAILED, undefined, err.message || 'Failed to fetch commissions');
    }
  }

  async getCommissionsByShop(req: Request, res: Response) {
    try {
      const shopId = parseId(req.params.shopId, 'shop');
      const commissions = await this.commissionService.getCommissionsByShop(shopId);
      return success(res, commissions, { message: 'Shop commissions retrieved', meta: { count: commissions.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'commission:byShop failed');
      const err = error as { statusCode?: number; message?: string };
      return failureCode(res, err.statusCode || 500, ErrorCodes.GET_COMMISSIONS_FAILED, undefined, err.message || 'Failed to fetch commissions');
    }
  }

  async updateCommission(req: Request, res: Response) {
    try {
      const id = parseId(req.params.id, 'commission');
  const userId = (req as { user?: { id?: number } }).user?.id ?? 0;
      const updateData: UpdateCommissionDTO = req.body;
      const commission = await this.commissionService.updateCommission(id, updateData, userId);
      if (!commission) {
        return failureCode(res, 404, ErrorCodes.COMMISSION_NOT_FOUND, undefined, 'Commission not found');
      }
      return success(res, commission, { message: 'Commission updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'commission:update failed');
      const err = error as { statusCode?: number; message?: string };
      return failureCode(res, err.statusCode || 500, ErrorCodes.UPDATE_COMMISSION_FAILED, undefined, err.message || 'Failed to update commission');
    }
  }
}
