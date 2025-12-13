import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  shop_id: z.preprocess((val) => Number(val), z.number().int().positive()),
  farmer_id: z.preprocess((val) => val === null || val === undefined || val === '' ? undefined : Number(val), z.number().int().positive()).optional(),
  buyer_id: z.preprocess((val) => val === null || val === undefined || val === '' ? undefined : Number(val), z.number().int().positive()).optional(),
  category_id: z.preprocess((val) => Number(val), z.number().int().positive()),
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.preprocess((val) => Number(val), z.number().positive()),
  unit_price: z.preprocess((val) => Number(val), z.number().positive()),
  // Optional fields that may be included but will be ignored
  product_id: z.preprocess((val) => val === null || val === undefined || val === '' ? undefined : Number(val), z.number().int().positive()).optional(),
  commission_rate: z.preprocess((val) => val === null || val === undefined || val === '' ? undefined : Number(val), z.number().min(0).max(100)).optional(),
  total_sale_value: z.number().optional(), // Ignored - calculated automatically
  shop_commission: z.number().optional(),  // Ignored - calculated automatically  
  farmer_earning: z.number().optional(),   // Ignored - calculated automatically
  payments: z.array(z.object({
    payer_type: z.preprocess(
      (val) => typeof val === 'string' ? val.toUpperCase() : val,
      z.enum(['BUYER', 'SHOP'])
    ),
    payee_type: z.preprocess(
      (val) => typeof val === 'string' ? val.toUpperCase() : val,
      z.enum(['SHOP', 'FARMER'])
    ),
    amount: z.preprocess((val) => Number(val), z.number().positive()),
    method: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const normalized = val.toUpperCase();
        // Map frontend payment methods to backend enum
        if (normalized === 'BANK_TRANSFER') return 'BANK';
        if (normalized === 'CARD') return 'OTHER';
        if (normalized === 'CHEQUE') return 'OTHER';
        return normalized;
      },
      z.enum(['CASH', 'BANK', 'UPI', 'OTHER'])
    ).optional(),
    status: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const normalized = val.toUpperCase();
        // Map frontend status values to backend enum
        if (normalized === 'COMPLETED') return 'PAID';
        return normalized;
      },
      z.enum(['PENDING', 'PAID', 'FAILED'])
    ).optional(),
    payment_date: z.string().optional(),
    notes: z.string().optional()
  })).optional()    // Now supported directly in the main endpoint
}).refine((data) => !!data.farmer_id || !!data.buyer_id, {
  message: 'At least one of farmer_id or buyer_id is required',
  path: ['participant']
});

// Payment schemas moved to payment.ts to avoid duplicate exports