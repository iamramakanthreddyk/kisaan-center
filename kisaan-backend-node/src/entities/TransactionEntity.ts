/**
 * TransactionEntity - Domain Entity for Transaction
 * Enhanced with comprehensive financial tracking
 */
export class TransactionEntity {
  id?: number;
  shop_id?: number;
  farmer_id?: number;
  buyer_id?: number;
  product_id?: number;
  category_id?: number;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  total_amount?: number; // Legacy field
  
  // Enhanced Financial Tracking (New)
  total_sale_value?: number; // Total sale amount
  shop_commission?: number; // Shop commission (canonical field)
  commission_rate?: number;
  commission_type?: string;
  commission_amount?: number; // Platform commission
  user_share?: number; // User earnings (total_sale_value - commission_amount)
  amount?: number; // Transaction-related expenses
  net_user_earning?: number; // Computed: user_share - amount
  
  // Legacy fields (kept for backwards compatibility)
  farmer_earning?: number; // Maps to user_share
  
  status?: 'pending' | 'completed' | 'partial' | 'cancelled' | 'settled';
  transaction_date?: Date;
  settlement_date?: Date | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;

  payments?: unknown[];

  constructor(init?: Partial<TransactionEntity>) {
    Object.assign(this, init);
  }
}