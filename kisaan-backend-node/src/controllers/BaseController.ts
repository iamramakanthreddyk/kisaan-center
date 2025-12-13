import { getSettlements } from '../services/settlementService';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ResponseUtils, ControllerUtils } from '../utils/routeUtils';

/**
 * Base Controller Class - Standardized pattern for all controllers
 * Provides common functionality and consistent error handling
 */
export abstract class BaseController {
  /**
   * Standard async handler wrapper
   */
  public asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => void | Promise<void>>(fn: T) {
    return ControllerUtils.asyncHandler(fn);
  }

  /**
   * Validate required parameters
   */
  public validateParams(req: Request, requiredParams: string[]): string[] {
    return ControllerUtils.validateParams(req, requiredParams);
  }

  /**
   * Parse and validate ID parameter
   */
  public parseId(value: string, paramName: string = 'id'): number {
    return ControllerUtils.parseId(value, paramName);
  }

  /**
   * Send success response
   */
  public sendSuccess<T>(res: Response, data: T, message?: string, meta?: Record<string, unknown>): void {
    ResponseUtils.success(res, data, message, meta);
  }

  /**
   * Send error response
   */
  public sendError(res: Response, message: string, statusCode: number = 400, details?: unknown): void {
    ResponseUtils.error(res, message, statusCode, details);
  }

  /**
   * Send validation error response
   */
  public sendValidationError(res: Response, errors: unknown): void {
    ResponseUtils.validationError(res, errors);
  }

  /**
   * Send paginated response
   */
  public sendPaginated<T>(res: Response, data: T[], total: number, page: number, limit: number): void {
    ResponseUtils.paginated(res, data, total, page, limit);
  }

  // Abstract methods that must be implemented by child controllers
  abstract getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  abstract getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  abstract create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  abstract update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  abstract delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}

/**
 * Example: Standardized Settlement Controller
 */
export class SettlementController extends BaseController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shop_id, user_id, user_type, status } = req.query;
      
      if (!shop_id) {
        return this.sendError(res, 'shop_id is required');
      }

      // Use service layer (would be injected in real implementation)
      const settlements = await getSettlements({
        shop_id: shop_id as string,
        user_id: user_id as string,
        user_type: user_type as string,
        status: status as string
      });
      this.sendSuccess(res, settlements);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = this.parseId(req.params.id);
      
      // Service call would go here
      const settlement = {
        id,
        shop_id: 1,
        amount: 150.00,
        type: 'commission',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      this.sendSuccess(res, settlement);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        return this.sendError(res, error.message, 400);
      }
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const missing = this.validateParams(req, ['shop_id', 'amount']);
      if (missing.length > 0) {
        return this.sendError(res, `Missing required parameters: ${missing.join(', ')}`);
      }

      const { shop_id, amount, type } = req.body;
      
      if (amount <= 0) {
        return this.sendError(res, 'Amount must be greater than 0');
      }

      // Service call would go here
      const settlement = {
        id: Date.now(),
        shop_id,
        amount,
        type: type || 'commission',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      this.sendSuccess(res, settlement, 'Settlement created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = this.parseId(req.params.id);
      const { status, amount } = req.body;

      // Service call would go here
      const settlement = {
        id,
        shop_id: 1,
        amount: amount || 150.00,
        type: 'commission',
        status: status || 'updated',
        updated_at: new Date().toISOString()
      };

      this.sendSuccess(res, settlement, 'Settlement updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = this.parseId(req.params.id);
      
      // Service call would go here
      this.sendSuccess(res, { id }, 'Settlement deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Custom settlement-specific methods
  async getSettlementSummaryController(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Service call would go here
      const summary = {
        totalPending: 1500.00,
        totalSettled: 8500.00,
        pendingCount: 5,
        settledCount: 23
      };

      this.sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }

  async settleAmountController(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settlementId = this.parseId(req.params.settlement_id, 'settlement_id');
      
      // Service call would go here
      const result = {
        settlement_id: settlementId,
        status: 'settled',
        settled_at: new Date().toISOString()
      };

      this.sendSuccess(res, result, 'Amount settled successfully');
    } catch (error) {
      next(error);
    }
  }

  async createExpenseController(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const missing = this.validateParams(req, ['shop_id', 'amount', 'description']);
      if (missing.length > 0) {
        return this.sendError(res, `Missing required parameters: ${missing.join(', ')}`);
      }

      const { shop_id, amount, description } = req.body;
      
      // Service call would go here
      const expense = {
        id: Date.now(),
        shop_id,
        amount,
        description,
        type: 'expense',
        created_at: new Date().toISOString()
      };

      this.sendSuccess(res, expense, 'Expense created successfully');
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Factory function to create standardized controllers
 */
export function createStandardController(serviceName: string) {
  return class extends BaseController {
    public serviceName = serviceName;

    async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        // Generic implementation using service name
        const service = this.getService();
  const result = await service.getAll(req.query, (req as AuthenticatedRequest).user);
        this.sendSuccess(res, result);
      } catch (error) {
        next(error);
      }
    }

    async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const id = this.parseId(req.params.id);
        const service = this.getService();
  const result = await service.getById(id, (req as AuthenticatedRequest).user);
        this.sendSuccess(res, result);
      } catch (error) {
        next(error);
      }
    }

    async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const service = this.getService();
  const result = await service.create(req.body, (req as AuthenticatedRequest).user);
        this.sendSuccess(res, result, `${this.serviceName} created successfully`);
      } catch (error) {
        next(error);
      }
    }

    async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const id = this.parseId(req.params.id);
        const service = this.getService();
  const result = await service.update(id, req.body, (req as AuthenticatedRequest).user);
        this.sendSuccess(res, result, `${this.serviceName} updated successfully`);
      } catch (error) {
        next(error);
      }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const id = this.parseId(req.params.id);
        const service = this.getService();
  await service.delete(id, (req as AuthenticatedRequest).user);
        this.sendSuccess(res, { id }, `${this.serviceName} deleted successfully`);
      } catch (error) {
        next(error);
      }
    }

    public getService() {
      // Dynamic service loading
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ServiceClass = require(`../services/${this.serviceName}Service`)[`${this.serviceName.charAt(0).toUpperCase() + this.serviceName.slice(1)}Service`];
        return new ServiceClass();
      } catch (error) {
        throw new Error(`Service ${this.serviceName} not found`);
      }
    }
  };
}
