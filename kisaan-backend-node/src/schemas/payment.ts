import { z } from 'zod';
import { PAYMENT_PAYER_TYPES, PAYMENT_PAYEE_TYPES, PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_UPDATE_STATUSES } from '../constants/payment';

export const CreatePaymentSchema = z.object({
  transaction_id: z.preprocess((val) => val === undefined || val === null || val === '' ? undefined : Number(val), z.number().int().positive()).optional(),
  payer_type: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_PAYER_TYPES)),
  payee_type: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_PAYEE_TYPES)),
  amount: z.preprocess((val) => Number(val), z.number().positive()),
  method: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_METHODS)),
  status: z.preprocess((val) => {
    if (typeof val === 'string') {
      const upper = val.toUpperCase();
      // Map COMPLETED to PAID for database compatibility
      return upper === 'COMPLETED' ? 'PAID' : upper;
    }
    return val;
  }, z.enum(PAYMENT_STATUSES)).optional(),
  notes: z.string().optional(),
  counterparty_id: z.preprocess((val) => Number(val), z.number().int().positive()).optional(),
  shop_id: z.preprocess((val) => Number(val), z.number().int().positive()).optional(),
  payment_date: z.string().datetime().optional()
  ,
  // Allow clients to explicitly force a payment that would otherwise be rejected by business rules
  force_override: z.boolean().optional()
});

// Bulk payment schema
export const BulkPaymentItemSchema = z.object({
  transaction_id: z.preprocess((val) => Number(val), z.number().int().positive()),
  amount: z.preprocess((val) => Number(val), z.number().positive()),
});

export const BulkPaymentSchema = z.object({
  payments: z.array(BulkPaymentItemSchema),
  payer_type: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_PAYER_TYPES)),
  payee_type: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_PAYEE_TYPES)),
  method: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(PAYMENT_METHODS)),
  status: z.preprocess((val) => {
    if (typeof val === 'string') {
      const upper = val.toUpperCase();
      // Map COMPLETED to PAID for database compatibility
      return upper === 'COMPLETED' ? 'PAID' : upper;
    }
    return val;
  }, z.enum(PAYMENT_STATUSES)).optional(),
  notes: z.string().optional(),
});

export const UpdatePaymentStatusSchema = z.object({
  status: z.enum(PAYMENT_UPDATE_STATUSES),
  payment_date: z.string().datetime().optional(),
  notes: z.string().optional()
});

export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentStatus = z.infer<typeof UpdatePaymentStatusSchema>;