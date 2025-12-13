import { z } from 'zod';

export const CreateCommissionSchema = z.object({
  shop_id: z.number().int().positive(),
  rate: z.number().positive().max(100),
  type: z.enum(['percentage', 'fixed'])
});

export const UpdateCommissionSchema = z.object({
  rate: z.number().positive().max(100).optional(),
  type: z.enum(['percentage', 'fixed']).optional()
});