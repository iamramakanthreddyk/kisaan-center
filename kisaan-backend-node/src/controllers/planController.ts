import { Request, Response } from 'express';
import { PlanService } from '../services/planService';
import { PlanCreateSchema, PlanUpdateSchema } from '../schemas/plan';
import { validate, ValidationFailure } from '../shared/validation/validate';
import { success, failureCode, created, standardDelete } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { z } from 'zod';
import { parseId } from '../shared/utils/parse';

export class PlanController {
  private planService: PlanService;

  constructor() {
    this.planService = new PlanService();
  }
  async createPlan(req: Request, res: Response) {
    try {
      req.log?.info({ body: req.body }, 'plan:create request');
      // Accept features as array, store as JSON string
      const input = { ...req.body };
      if (typeof input.is_active === 'boolean' && !input.status) {
        input.status = input.is_active ? 'active' : 'inactive';
      }
      // If features is a string, parse it to array for validation
      if (typeof input.features === 'string') {
        try {
          input.features = JSON.parse(input.features);
        } catch {
          input.features = [];
        }
      }
      const validatedData = validate(PlanCreateSchema, input);
      // Create plan data with proper types for the service
      const planData = {
        ...validatedData,
        features: validatedData.features || [], // Pass as array
        // removed legacy limit/pricing fields in simplified model
      };
      const plan = await this.planService.createPlan(planData);
      return created(res, plan, { message: 'Plan created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:create failed');
      if (error instanceof ValidationFailure || error instanceof z.ZodError) {
        const issues = (error as ValidationFailure | z.ZodError).issues;
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, issues, 'Validation failed');
      }
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const errObj = error as { name?: string; message?: string };
        if (errObj.name === 'SequelizeUniqueConstraintError') {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { unique: 'name' }, 'Plan name must be unique');
        }
        if (errObj.name === 'SequelizeForeignKeyConstraintError') {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { reason: 'Invalid foreign key reference' }, 'Invalid foreign key reference');
        }
        return failureCode(res, 500, ErrorCodes.CREATE_PLAN_FAILED, undefined, errObj.message || 'Failed to create plan');
      }
      return failureCode(res, 500, ErrorCodes.CREATE_PLAN_FAILED, undefined, 'Failed to create plan');
    }
  }

  async getPlans(req: Request, res: Response) {
    try {
      const plans = await this.planService.getAllPlans();
      return success(res, plans, { message: 'Plans retrieved successfully', meta: { count: plans.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:list failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to retrieve plans';
      return failureCode(res, 500, ErrorCodes.GET_PLANS_FAILED, undefined, message);
    }
  }

  async getPlanById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const planId = parseId(id, 'plan id');
      const plan = await this.planService.getPlanById(planId);
      if (!plan) {
        return failureCode(res, 404, ErrorCodes.PLAN_NOT_FOUND, undefined, 'Plan not found');
      }
      return success(res, plan, { message: 'Plan retrieved successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:get failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to retrieve plan';
      return failureCode(res, 500, ErrorCodes.GET_PLAN_FAILED, undefined, message);
    }
  }

  async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const planId = parseId(id, 'plan id');
      // Accept features as array, store as JSON string
      const input = { ...req.body };
      if (typeof input.is_active === 'boolean' && !input.status) {
        input.status = input.is_active ? 'active' : 'inactive';
      }
      if (typeof input.features === 'string') {
        try {
          input.features = JSON.parse(input.features);
        } catch {
          input.features = [];
        }
      }
      const validatedData = validate(PlanUpdateSchema, input);
      const plan = await this.planService.updatePlan(planId, validatedData);
      if (!plan) {
        return failureCode(res, 404, ErrorCodes.PLAN_NOT_FOUND, undefined, 'Plan not found');
      }
      return success(res, plan, { message: 'Plan updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:update failed');
      if (error instanceof ValidationFailure || error instanceof z.ZodError) {
        const issues = (error as ValidationFailure | z.ZodError).issues;
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, issues, 'Validation failed');
      }
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const errObj = error as { name?: string; message?: string };
        if (errObj.name === 'SequelizeUniqueConstraintError') {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { unique: 'name' }, 'Plan name must be unique');
        }
        if (errObj.name === 'SequelizeForeignKeyConstraintError') {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { reason: 'Invalid foreign key reference' }, 'Invalid foreign key reference');
        }
        return failureCode(res, 500, ErrorCodes.UPDATE_PLAN_FAILED, undefined, errObj.message || 'Failed to update plan');
      }
      return failureCode(res, 500, ErrorCodes.UPDATE_PLAN_FAILED, undefined, 'Failed to update plan');
    }
  }

  async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const planId = parseId(id, 'plan id');
      const deleted = await this.planService.deletePlan(planId);
      if (!deleted) {
        return failureCode(res, 404, ErrorCodes.PLAN_NOT_FOUND, undefined, 'Plan not found');
      }
      return standardDelete(res, planId, 'plan');
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:delete failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to delete plan';
      return failureCode(res, 500, ErrorCodes.DELETE_PLAN_FAILED, undefined, message);
    }
  }

  async deactivatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const planId = parseId(id, 'plan id');
      // If deactivatePlan is not on the type, use type assertion
      const deactivate = (this.planService as { deactivatePlan?: (id: number) => Promise<unknown> }).deactivatePlan;
      if (!deactivate) {
        return failureCode(res, 500, ErrorCodes.DEACTIVATE_PLAN_FAILED, undefined, 'Deactivate method not implemented');
      }
      const updated = await deactivate.call(this.planService, planId);
      if (!updated) {
        return failureCode(res, 404, ErrorCodes.PLAN_NOT_FOUND, undefined, 'Plan not found');
      }
      return success(res, updated, { message: 'Plan deactivated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:deactivate failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to deactivate plan';
      return failureCode(res, 500, ErrorCodes.DEACTIVATE_PLAN_FAILED, undefined, message);
    }
  }

  // deactivatePlan & getActivePlans removed (no status concept in simplified model)

  async searchPlans(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'q' }, 'Search query is required');
      }
      const plans = await this.planService.searchPlans(q);
      return success(res, plans, { message: 'Plans search completed', meta: { count: plans.length, query: q } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'plan:search failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to search plans';
      return failureCode(res, 500, ErrorCodes.SEARCH_PLANS_FAILED, undefined, message);
    }
  }
}

export const planController = new PlanController();
