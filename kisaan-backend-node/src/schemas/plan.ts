import { z } from 'zod';
// Joi import deprecated (migrated fully to Zod). Keep commented for reference if rollback needed.
// import Joi from 'joi';

export const PlanBaseSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  monthly_price: z.number().nonnegative().optional().nullable(),
  quarterly_price: z.number().nonnegative().optional().nullable(),
  yearly_price: z.number().nonnegative().optional().nullable(),
  max_farmers: z.number().int().positive().optional().nullable(),
  max_buyers: z.number().int().positive().optional().nullable(),
  max_transactions: z.number().int().positive().optional().nullable(),
  data_retention_months: z.number().int().positive().optional().nullable(),
  features: z.array(z.string()).default([]),
  status: z.string().default('active'),
  // Test compatibility passthrough fields (they'll be mapped in controller):
  max_users: z.number().int().positive().optional().nullable(),
  max_products: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const PlanCreateSchema = PlanBaseSchema;

export const PlanUpdateSchema = PlanBaseSchema.partial();

export const PlanReadSchema = PlanBaseSchema.extend({
  id: z.number().int(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Deprecated legacy Joi schemas (replaced by Zod below). Keeping commented for short-term reference.
 *
 * // export const createPlanSchema = Joi.object({...})
 * // export const updatePlanSchema = Joi.object({...})
 * // export const planIdSchema = Joi.object({...})
 */

// New Zod equivalents matching previous Joi intent
export const PlanIdSchema = z.object({ id: z.number().int().positive() });
export const PlanLegacyCreateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  duration_months: z.number().int().min(1).max(12),
  features: z.array(z.string()).optional(),
  is_active: z.boolean().optional().default(true)
});
export const PlanLegacyUpdateSchema = PlanLegacyCreateSchema.partial();

export type PlanCreate = z.infer<typeof PlanCreateSchema>;
export type PlanUpdate = z.infer<typeof PlanUpdateSchema>;
export type PlanRead = z.infer<typeof PlanReadSchema>;
