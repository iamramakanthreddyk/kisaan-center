export interface PaymentResponse {
  id: number | string;
  transaction_id: number | null;
  shop_id: number | null;
  counterparty_id: number | null;
  payer_type: string;
  payee_type: string;
  method: string;
  status: string;
  amount: string | null; // fixed 2-decimal string
  amount_cents: number | null; // integer cents
  balance_before: string | null;
  balance_after: string | null;
  settlement_type?: string | null;
  settled_transactions: Array<Record<string, unknown>>;
  settled_expenses: Array<Record<string, unknown>>;
  fifo_result: unknown;
  applied_to_expenses: number;
  applied_to_balance: number;
  payment_date: string | Date | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  notes?: string;
}
