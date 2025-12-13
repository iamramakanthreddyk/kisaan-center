export type ProductCreate = z.infer<typeof CreateProductSchema>;
export type ProductUpdate = z.infer<typeof UpdateProductSchema>;
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category_id: z.number().int().positive(),
  description: z.string().optional(),
  unit: z.string().optional()
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.number().int().positive().optional(),
  description: z.string().optional(),
  unit: z.string().optional()
});