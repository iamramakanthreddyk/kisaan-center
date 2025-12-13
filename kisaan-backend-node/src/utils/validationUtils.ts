// Validation utility functions to eliminate duplication
import { z } from 'zod';

/**
 * Common validation schemas that can be reused across controllers
 */

// ID validation schema
export const IdSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Invalid ID format');
    }
    return parsed;
  })
});

// Pagination validation schema
export const PaginationSchema = z.object({
  page: z.string().optional().transform((val) => Math.max(1, parseInt(val || '1') || 1)),
  limit: z.string().optional().transform((val) => Math.min(100, Math.max(1, parseInt(val || '10') || 10))),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// Shop ID validation (for users with shop context)
export const ShopIdSchema = z.object({
  shop_id: z.number().int().positive('Shop ID must be a positive integer')
});

// Date range validation schema
export const DateRangeSchema = z.object({
  from_date: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, { message: 'Invalid from_date format' }),
  to_date: z.string().optional().refine((date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
  }, { message: 'Invalid to_date format' })
});

// Status validation schema
export const StatusSchema = z.object({
  status: z.enum(['active', 'inactive']).optional()
});

/**
 * Generic validation helper that can be used in any controller
 */
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: unknown } => {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error.issues };
    }
  } catch (error) {
    return { success: false, errors: [{ message: 'Validation error', error }] };
  }
};

/**
 * Validate array of items against a schema
 */
export const validateArray = <T>(schema: z.ZodSchema<T>, items: unknown[]): { success: boolean; data?: T[]; errors?: Array<{ index: number; errors: unknown }> } => {
  const results: T[] = [];
  const errors: Array<{ index: number; errors: unknown }> = [];
  
  for (let i = 0; i < items.length; i++) {
    const validation = validateSchema(schema, items[i]);
    if (validation.success && validation.data) {
      results.push(validation.data);
    } else {
      errors.push({ index: i, errors: validation.errors });
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: results };
};

/**
 * Common field validation helpers
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};


export const validateQuantity = (quantity: unknown): boolean => {
  if (typeof quantity === 'number') {
    return Number.isInteger(quantity) && quantity > 0;
  }
  if (typeof quantity === 'string') {
    const parsed = parseInt(quantity, 10);
    return !isNaN(parsed) && parsed > 0;
  }
  return false;
};