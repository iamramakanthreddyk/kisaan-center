import { Request, Response } from 'express';
import { CategoryService } from '../services/categoryService';
import { CategoryCreateSchema, CategoryUpdateSchema } from '../schemas/category';
import { validate, ValidationFailure } from '../shared/validation/validate';
import { success, failureCode, created, standardDelete } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { z } from 'zod';
import { parseId } from '../shared/utils/parse';

export class CategoryController {
  private categoryService = new CategoryService();

  async createCategory(req: Request, res: Response) {
    try {
      const payload = { ...req.body };
      const validatedData = validate(CategoryCreateSchema.passthrough(), payload);
      const category = await this.categoryService.createCategory(validatedData);
      return created(res, category, { message: 'Category created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:create failed');
      if (error instanceof ValidationFailure || error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, (error as z.ZodError).issues, 'Validation failed');
      }
      if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'SequelizeUniqueConstraintError') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { unique: 'name' }, 'Category name must be unique');
      }
      if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'SequelizeForeignKeyConstraintError') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { reason: 'Invalid foreign key reference' }, 'Invalid foreign key reference');
      }
      return failureCode(res, 500, ErrorCodes.CREATE_CATEGORY_FAILED, undefined, (error as Error)?.message || 'Failed to create category');
    }
  }

  async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await this.categoryService.getAllCategories();
      return success(res, categories, { message: 'Categories retrieved successfully', meta: { count: categories.length } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:list failed');
      return failureCode(res, 500, ErrorCodes.GET_CATEGORIES_FAILED, undefined, (error as Error)?.message || 'Failed to retrieve categories');
    }
  }

  async getCategoryById(req: Request, res: Response) {
    try {
      const categoryId = parseId(req.params.id, 'category');
      const category = await this.categoryService.getCategoryById(categoryId);
      if (!category) {
        return failureCode(res, 404, ErrorCodes.CATEGORY_NOT_FOUND, undefined, 'Category not found');
      }
      return success(res, category, { message: 'Category retrieved successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:get failed');
      return failureCode(res, 500, ErrorCodes.GET_CATEGORY_FAILED, undefined, (error as Error)?.message || 'Failed to retrieve category');
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const categoryId = parseId(req.params.id, 'category');
      const payload = { ...req.body };
      const validatedData = validate(CategoryUpdateSchema.passthrough(), payload);
      const category = await this.categoryService.updateCategory(categoryId, validatedData);
      if (!category) {
        return failureCode(res, 404, ErrorCodes.CATEGORY_NOT_FOUND, undefined, 'Category not found');
      }
      return success(res, category, { message: 'Category updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:update failed');
      if (error instanceof ValidationFailure || error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, (error as z.ZodError).issues, 'Validation failed');
      }
      if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'SequelizeUniqueConstraintError') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { unique: 'name' }, 'Category name must be unique');
      }
      if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'SequelizeForeignKeyConstraintError') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { reason: 'Invalid foreign key reference' }, 'Invalid foreign key reference');
      }
      return failureCode(res, 500, ErrorCodes.UPDATE_CATEGORY_FAILED, undefined, (error as Error)?.message || 'Failed to update category');
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const categoryId = parseId(req.params.id, 'category');
      const deleted = await this.categoryService.deleteCategory(categoryId);
      if (!deleted) {
        return failureCode(res, 404, ErrorCodes.CATEGORY_NOT_FOUND, undefined, 'Category not found');
      }
      return standardDelete(res, categoryId, 'category');
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:delete failed');
      return failureCode(res, 500, ErrorCodes.DELETE_CATEGORY_FAILED, undefined, (error as Error)?.message || 'Failed to delete category');
    }
  }

  // deactivateCategory & getActiveCategories removed in simplified model

  async searchCategories(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'q' }, 'Search query is required');
      }
      const categories = await this.categoryService.searchCategories(q);
      return success(res, categories, { message: 'Categories search completed', meta: { count: categories.length, query: q } });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'category:search failed');
      return failureCode(res, 500, ErrorCodes.SEARCH_CATEGORIES_FAILED, undefined, (error as Error)?.message || 'Failed to search categories');
    }
  }

  // reorderCategories removed (no display_order in simplified model)
}
