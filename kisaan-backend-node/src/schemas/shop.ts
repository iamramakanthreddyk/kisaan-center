import { z } from 'zod';

export const ShopStatusEnum = z.enum(['active', 'inactive']);

export const ShopBaseSchema = z.object({
  name: z.string().min(2).max(100),
  owner_id: z.number().int(),
  plan_id: z.number().int().positive().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  contact: z.string().min(10).max(15).optional().nullable(),
  status: ShopStatusEnum.default('active'),
  category_id: z.number().int().positive(),
});

export const ShopCreateSchema = ShopBaseSchema.omit({ status: true });

export const ShopUpdateSchema = ShopBaseSchema.partial();

export const ShopReadSchema = ShopBaseSchema.extend({
  id: z.number().int(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type ShopStatus = z.infer<typeof ShopStatusEnum>;
export type ShopCreate = z.infer<typeof ShopCreateSchema>;
export type ShopUpdate = z.infer<typeof ShopUpdateSchema>;
export type ShopRead = z.infer<typeof ShopReadSchema>;
