import { z } from 'zod';

export const CategoryBaseSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const CategoryCreateSchema = CategoryBaseSchema;

export const CategoryUpdateSchema = CategoryBaseSchema.partial();

export const CategoryReadSchema = CategoryBaseSchema.extend({
  id: z.number().int(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type CategoryRead = z.infer<typeof CategoryReadSchema>;
