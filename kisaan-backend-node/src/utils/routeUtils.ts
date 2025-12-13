import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../shared/logging/logger';

/**
 * Common route utilities to eliminate duplication across route files
 */

/**
 * Date utility functions used across multiple routes
 */
export const DateUtils = {
  /**
   * Expand YYYY-MM-DD date string to full day ISO string
   * Used in transaction, settlement, and other date-filtered routes
   */
  expandToFullDay(dateStr: string, isEnd: boolean): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return isEnd
        ? `${dateStr}T23:59:59.999Z`
        : `${dateStr}T00:00:00.000Z`;
    }
    return dateStr;
  },

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Parse date range from query parameters with defaults
   */
  parseDateRange(query: Record<string, string | undefined>): { startDate: Date; endDate: Date } {
    const { from_date, to_date, startDate, endDate } = query;
    // Support both frontend (from_date/to_date) and backend (startDate/endDate) params
    let filterStart: string = from_date ?? startDate ?? '';
    let filterEnd: string = to_date ?? endDate ?? '';

    // Default to today if no dates provided
    if (!filterStart || !filterEnd) {
      const today = this.getTodayString();
      filterStart = today;
      filterEnd = today;
    }

    return {
      startDate: new Date(this.expandToFullDay(filterStart, false)),
      endDate: new Date(this.expandToFullDay(filterEnd, true))
    };
  }
};

/**
 * Authentication and authorization utilities
 */
export const AuthUtils = {
  /**
   * Get user context filters based on role
   */
  getUserFilters(
    user: { role?: string; shop_id?: number; id?: number },
    overrides: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = { ...overrides };

    // Apply role-based filtering
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { USER_ROLES } = require('../shared/constants');
    if (user && user.role === USER_ROLES.OWNER && user.shop_id && !filters.shopId) {
      filters.shopId = Number(user.shop_id);
    }
    if (user && user.role === USER_ROLES.FARMER && !filters.farmerId) {
      filters.farmerId = Number(user.id);
    }
    if (user && user.role === USER_ROLES.BUYER && !filters.buyerId) {
      filters.buyerId = Number(user.id);
    }

    return filters;
  },

  /**
   * Validate required context for operations
   */
  validateContext(filters: Record<string, unknown>, requiredFields: string[]): string | null {
    for (const field of requiredFields) {
      if (!filters[field]) {
        return `Missing required ${field}`;
      }
    }
    return null;
  }
};

/**
 * Response formatting utilities
 */
export const ResponseUtils = {
  /**
   * Standard success response
   */
  success<T>(res: Response, data: T, message?: string, meta?: Record<string, unknown>): void {
    res.json({
      success: true,
      message,
      data,
      ...meta
    });
  },

  /**
   * Standard error response
   */
  error(res: Response, message: string, statusCode: number = 400, details?: unknown): void {
    res.status(statusCode).json({
      success: false,
      message,
      error: message,
      details
    });
  },

  /**
   * Validation error response
   */
  validationError(res: Response, errors: unknown): void {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'Validation failed',
      details: errors
    });
  },

  /**
   * Paginated response
   */
  paginated<T>(res: Response, data: T[], total: number, page: number, limit: number): void {
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
};

/**
 * Service layer utilities for consistent service calls
 */
export const ServiceUtils = {
  /**
   * Execute service method with error handling
   */
  async executeService<T>(
    serviceMethod: () => Promise<T>, 
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<T | void> {
    try {
      const result = await serviceMethod();
      return result;
    } catch (error: unknown) {
      const reqWithLog = req as Request & { log?: { error?: (obj: unknown, msg: string) => void } };
      if (reqWithLog.log && typeof reqWithLog.log.error === 'function') {
        reqWithLog.log.error({ err: error }, 'service execution error');
      }
      logger.error({ err: error }, 'service execution error');
      if (typeof error === 'object' && error && ('status' in error || 'statusCode' in error)) {
        ResponseUtils.error(res, (error as { message?: string }).message || 'Error', (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500);
        return;
      }
      next(error);
    }
  },

  /**
   * Dynamic service instantiation
   */
  getService<T = unknown>(serviceName: string): T {
    try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ServiceClass = require(`../services/${serviceName}Service`)[`${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service`];
  return new ServiceClass();
  } catch (error: unknown) {
      logger.error({ err: error, serviceName }, 'failed to instantiate service');
      throw new Error(`Service ${serviceName} not found`);
    }
  }
};

/**
 * Controller pattern utilities
 */
export const ControllerUtils = {
  /**
   * Standard controller method wrapper with error handling
   */
  asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | void
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  },

  /**
   * Parameter validation helper
   */
  validateParams(req: Request, requiredParams: string[]): string[] {
    const missing: string[] = [];
    for (const param of requiredParams) {
      if (!req.params[param] && !req.body[param] && !req.query[param]) {
        missing.push(param);
      }
    }
    return missing;
  },

  /**
   * ID parameter parser with validation
   */
  parseId(value: string, paramName: string = 'id'): number {
    const id = parseInt(value);
    if (isNaN(id) || id <= 0) {
      throw new Error(`Invalid ${paramName}: must be a positive integer`);
    }
    return id;
  }
};

/**
 * Route factory for common CRUD operations
 */
export class RouteFactory {
  /**
   * Create standard CRUD routes for a resource
   */
  static createCrudRoutes(resourceName: string, controllerClass: new () => unknown) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('express').Router();
    const controller = new controllerClass();

    // Helper to safely access dynamic properties
    type ExpressHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
    function getControllerMethod(key: string): ExpressHandler {
      const value = (controller as Record<string, unknown>)[key];
      if (typeof value === 'function') {
        return value.bind(controller) as ExpressHandler;
      }
      return (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error(`Controller method '${String(key)}' not implemented for resource '${resourceName}'`));
      };
    }

    // GET /resource - List all
    router.get('/', ControllerUtils.asyncHandler(
      typeof (controller as Record<string, unknown>)["getAll"] === 'function'
        ? getControllerMethod('getAll')
        : getControllerMethod(`get${resourceName}s` as keyof typeof controller)
    ));

    // GET /resource/:id - Get by ID
    router.get('/:id', ControllerUtils.asyncHandler(
      typeof (controller as Record<string, unknown>)["getById"] === 'function'
        ? getControllerMethod('getById')
        : getControllerMethod(`get${resourceName}ById` as keyof typeof controller)
    ));

    // POST /resource - Create
    router.post('/', ControllerUtils.asyncHandler(
      typeof (controller as Record<string, unknown>)["create"] === 'function'
        ? getControllerMethod('create')
        : getControllerMethod(`create${resourceName}` as keyof typeof controller)
    ));

    // PUT /resource/:id - Update
    router.put('/:id', ControllerUtils.asyncHandler(
      typeof (controller as Record<string, unknown>)["update"] === 'function'
        ? getControllerMethod('update')
        : getControllerMethod(`update${resourceName}` as keyof typeof controller)
    ));

    // DELETE /resource/:id - Delete
    router.delete('/:id', ControllerUtils.asyncHandler(
      typeof (controller as Record<string, unknown>)["delete"] === 'function'
        ? getControllerMethod('delete')
        : getControllerMethod(`delete${resourceName}` as keyof typeof controller)
    ));

    return router;
  }

  /**
   * Create analytics routes for a resource
   */
  static createAnalyticsRoutes(resourceName: string, controllerClass: new () => unknown) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('express').Router();
    const controller = new controllerClass();

    type ExpressHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  function getControllerMethod(key: string): ExpressHandler {
  const value = (controller as Record<string, unknown>)[key];
      if (typeof value === 'function') {
        return value.bind(controller) as ExpressHandler;
      }
      return (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error(`Controller method '${String(key)}' not implemented for resource '${resourceName}'`));
      };
    }

    router.get('/analytics', ControllerUtils.asyncHandler(getControllerMethod('getAnalytics')));
    router.get('/summary', ControllerUtils.asyncHandler(getControllerMethod('getSummary')));
    router.get('/dashboard', ControllerUtils.asyncHandler(getControllerMethod('getDashboard')));
    return router;
  }
}

/**
 * Middleware utilities
 */
export const MiddlewareUtils = {
  /**
   * Role-based access wrapper
   */
  requireRoles(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return ResponseUtils.error(res, 'Authentication required', 401);
      }

      if (!roles.includes(req.user.role)) {
        return ResponseUtils.error(res, 'Insufficient permissions', 403);
      }

      next();
    };
  },

  /**
   * Shop ownership validation
   */
  validateShopOwnership() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const shopId = req.params.shop_id || req.body.shop_id || req.query.shop_id;
      
      if (req.user?.role === 'owner' && req.user.shop_id !== parseInt(shopId)) {
        return ResponseUtils.error(res, 'Access denied: shop ownership required', 403);
      }

      next();
    };
  }
};