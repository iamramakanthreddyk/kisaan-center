// Utility to build a transaction creation payload consistently
// Keeps TransactionForm lean & enforces DRY logic.
// Backend currently accepts commission_rate as percentage (falls back to shop default if absent).
// Reference: docs/TRANSACTION_FLOW.md for end-to-end explanation of derived field logic & rationale.

export interface BuildTransactionInput {
  shop_id: number;
  farmer_id: number;
  buyer_id: number;
  category_id: number;
  product_name: string;
  product_id?: number;
  quantity: number;
  unit_price: number;
  commission_rate_decimal: number; // e.g. 0.10 for 10%
  totals: {
    total_amount: number;        // Updated to match backend schema
    commission_amount: number;   // Updated to match backend schema
    farmer_earning: number;
  };
  payments: Array<{
    payer_type: 'buyer' | 'shop';
    payee_type: 'shop' | 'farmer';
    amount: number;
    status: 'PAID' | 'PENDING';
    method: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
    payment_date: string;
  }>;
}

export function buildTransactionPayload(input: BuildTransactionInput) {
  const commission_rate = Number((input.commission_rate_decimal * 100).toFixed(4));
  return {
    shop_id: input.shop_id,
    farmer_id: input.farmer_id,
    buyer_id: input.buyer_id,
    category_id: input.category_id,
    product_name: input.product_name,
    product_id: input.product_id,
    quantity: input.quantity,
    unit_price: input.unit_price,
    commission_rate,
    total_amount: Number(input.totals.total_amount.toFixed(2)),      // Updated field name
    commission_amount: Number(input.totals.commission_amount.toFixed(2)), // Updated field name
    farmer_earning: Number(input.totals.farmer_earning.toFixed(2)),
    payments: input.payments.map(p => ({
      ...p,
      amount: Number(p.amount.toFixed(2))
    }))
  };
}
