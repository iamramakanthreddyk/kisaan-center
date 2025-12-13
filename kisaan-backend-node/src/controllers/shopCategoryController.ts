import { Request, Response } from 'express';
import sequelize from '../config/database';
import { success, created, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { z } from 'zod';
import { AssignCategoriesToShopSchema, RemoveCategoriesFromShopSchema, AssignSingleCategorySchema } from '../schemas/shopCategory';

/**
 * Controller implementing shop-category assignment endpoints expected by tests.
 * NOTE: Using raw SQL for speed; future refactor could leverage models.
 */
class ShopCategoryController {
  // GET /api/shop-categories/shop/:shopId/categories or /api/shops/:id/categories
  async getShopCategories(req: Request, res: Response) {
    try {
      // Handle both :shopId and :id parameter names
      const shopIdParam = req.params.shopId || req.params.id;
      const shopId = Number(shopIdParam);
      
      if (!shopIdParam || isNaN(shopId) || shopId <= 0) {
        return failureCode(res, 400, ErrorCodes.GET_SHOP_CATEGORIES_FAILED, { 
          error: `Invalid shop ID: ${shopIdParam}` 
        });
      }
      
      const [results] = await sequelize.query(
        `SELECT c.*, sc.is_active as assigned_active
         FROM kisaan_categories c
         INNER JOIN kisaan_shop_categories sc ON c.id = sc.category_id
         WHERE sc.shop_id = :shopId AND sc.is_active = true
         ORDER BY c.name`,
        { replacements: { shopId } }
      );
      success(res, Array.isArray(results) ? results : []);
    } catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.GET_SHOP_CATEGORIES_FAILED, { error: message });
    }
  }

  // GET /api/shop-categories/category/:categoryId/shops
  async getCategoryShops(req: Request, res: Response) {
    try {
      const categoryId = Number(req.params.categoryId);
      const [results] = await sequelize.query(
        `SELECT s.* , sc.is_active as assigned_active
         FROM kisaan_shops s
         INNER JOIN kisaan_shop_categories sc ON s.id = sc.shop_id
         WHERE sc.category_id = :categoryId AND sc.is_active = true
         ORDER BY s.id`,
        { replacements: { categoryId } }
      );
      success(res, Array.isArray(results) ? results : []);
    } catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.GET_CATEGORY_SHOPS_FAILED, { error: message });
    }
  }

  // GET /api/shop-categories/check/:shopId/:categoryId
  async checkAssignment(req: Request, res: Response) {
    try {
      const shopId = Number(req.params.shopId);
      const categoryId = Number(req.params.categoryId);
  const [rows]: unknown[] = await sequelize.query(
        `SELECT 1 FROM kisaan_shop_categories 
         WHERE shop_id = :shopId AND category_id = :categoryId AND is_active = true LIMIT 1`,
        { replacements: { shopId, categoryId } }
      );
  const arr = Array.isArray(rows) ? rows : [];
  success(res, { is_assigned: arr.length > 0 });
    } catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.CHECK_ASSIGNMENT_FAILED, { error: message });
    }
  }

  // GET /api/shop-categories/assignments
  async getAllAssignments(req: Request, res: Response) {
    try {
      const [rows] = await sequelize.query(
        `SELECT * FROM kisaan_shop_categories WHERE is_active = true ORDER BY shop_id, category_id`);
      success(res, Array.isArray(rows) ? rows : []);
    } catch (error: unknown) {
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.GET_ASSIGNMENTS_FAILED, { error: message });
    }
  }

  // POST /api/shop-categories/assign  { shop_id, category_ids: [] }
  async bulkAssign(req: Request, res: Response) {
    try {
      const { shop_id, category_ids } = AssignCategoriesToShopSchema.parse(req.body);
      const results: unknown[] = [];
      for (const category_id of category_ids) {
        const [row]: unknown[] = await sequelize.query(
          `INSERT INTO kisaan_shop_categories (shop_id, category_id, is_active, created_at, updated_at)
           VALUES (:shop_id, :category_id, true, NOW(), NOW())
           ON CONFLICT (shop_id, category_id)
           DO UPDATE SET is_active = true, updated_at = NOW()
           RETURNING *`,
          { replacements: { shop_id, category_id } }
        );
  if (Array.isArray(row) && row[0]) results.push(row[0]);
      }
      created(res, results, { message: 'Categories assigned' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { issues: error.issues }, 'Validation failed');
      }
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.BULK_ASSIGN_FAILED, { error: message });
    }
  }

  // POST /api/shop-categories/remove  { shop_id, category_ids: [] }
  async bulkRemove(req: Request, res: Response) {
    try {
      const { shop_id, category_ids } = RemoveCategoriesFromShopSchema.parse(req.body);
  const [result]: unknown[] = await sequelize.query(
        `UPDATE kisaan_shop_categories SET is_active = false, updated_at = NOW()
         WHERE shop_id = :shop_id AND category_id = ANY(:category_ids::int[]) AND is_active = true`,
        { replacements: { shop_id, category_ids } }
      );
  const removed = (typeof result === 'object' && result !== null && 'rowCount' in result) ? (result as { rowCount?: number }).rowCount ?? 0 : 0;
      success(res, { removed_count: removed }, { message: 'Categories removed' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { issues: error.issues }, 'Validation failed');
      }
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.BULK_REMOVE_FAILED, { error: message });
    }
  }

  // Existing single assign (not used in current tests but retained)
  async assignCategoryToShop(req: Request, res: Response) {
    try {
      const { shopId, categoryId } = AssignSingleCategorySchema.parse(req.params);
      const shop_id = shopId; // already number via transform
      const category_id = categoryId;
  const [mapping]: unknown[] = await sequelize.query(
        `INSERT INTO kisaan_shop_categories (shop_id, category_id, is_active, created_at, updated_at)
         VALUES (:shop_id, :category_id, true, NOW(), NOW())
         ON CONFLICT (shop_id, category_id)
         DO UPDATE SET is_active = true, updated_at = NOW()
         RETURNING *`,
        { replacements: { shop_id, category_id } }
      );
  created(res, Array.isArray(mapping) ? mapping : [mapping], { message: 'Category assigned to shop' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { issues: error.issues }, 'Validation failed');
      }
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.ASSIGN_SINGLE_FAILED, { error: message });
    }
  }

  // Existing single remove
  async removeCategoryFromShop(req: Request, res: Response) {
    try {
      const { shopId, categoryId } = AssignSingleCategorySchema.parse(req.params);
      const shop_id = shopId;
      const category_id = categoryId;
      await sequelize.query(
        `UPDATE kisaan_shop_categories 
         SET is_active = false, updated_at = NOW()
         WHERE shop_id = :shop_id AND category_id = :category_id`,
        { replacements: { shop_id, category_id } }
      );
      success(res, { }, { message: 'Category removed from shop' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { issues: error.issues }, 'Validation failed');
      }
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Unknown error';
      failureCode(res, 500, ErrorCodes.REMOVE_SINGLE_FAILED, { error: message });
    }
  }
}

const shopCategoryController = new ShopCategoryController();
export { shopCategoryController };
export const getShopCategories = shopCategoryController.getShopCategories.bind(shopCategoryController);
