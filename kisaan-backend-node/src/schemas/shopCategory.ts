import { z } from 'zod';

// Core base schemas
export const ShopCategoryBaseSchema = z.object({
  shop_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
});

export const ShopCategoryCreateSchema = ShopCategoryBaseSchema;

export const ShopCategoryReadSchema = ShopCategoryBaseSchema.extend({
  id: z.number().int(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Bulk operations
export const AssignCategoriesToShopSchema = z.object({
  shop_id: z.preprocess((val) => Number(val), z.number().int().positive()),
  category_ids: z.array(z.preprocess((val) => Number(val), z.number().int().positive())).min(1),
});

export const RemoveCategoriesFromShopSchema = z.object({
  shop_id: z.preprocess((val) => Number(val), z.number().int().positive()),
  category_ids: z.array(z.preprocess((val) => Number(val), z.number().int().positive())).min(1),
});

// Simple alias schemas (previous names) for integration refactor mapping
export const BulkAssignShopCategoriesSchema = AssignCategoriesToShopSchema;
export const BulkRemoveShopCategoriesSchema = RemoveCategoriesFromShopSchema;

// Single assign/remove param pair (route params are strings -> transform)
export const AssignSingleCategorySchema = z.object({
  shopId: z.string().regex(/^\d+$/).transform(Number),
  categoryId: z.string().regex(/^\d+$/).transform(Number)
});

export type ShopCategoryCreate = z.infer<typeof ShopCategoryCreateSchema>;
export type ShopCategoryRead = z.infer<typeof ShopCategoryReadSchema>;
export type AssignCategoriesToShop = z.infer<typeof AssignCategoriesToShopSchema>;
export type RemoveCategoriesFromShop = z.infer<typeof RemoveCategoriesFromShopSchema>;
