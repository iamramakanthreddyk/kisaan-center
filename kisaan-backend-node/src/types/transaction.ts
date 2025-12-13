/**
 * Transaction-related type definitions
 */

export interface TransactionDTO {
  id: number;
  farmer_id?: number;
  buyer_id?: number;
  shop_id: number;
  product_name: string;
  quantity: number;
  rate: number;
  total_amount: number;
  commission_amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_PAID' | 'SETTLED';
  created_at: Date;
  updated_at: Date;
  // Enriched fields
  farmer_name?: string;
  buyer_name?: string;
  shop_name?: string;
  payments?: import('../models/payment').Payment[];
  paid_amount?: number;
  pending_amount?: number;
}

export interface TransactionFilters {
  shop_id?: number;
  farmer_id?: number;
  buyer_id?: number;
  status?: string;
  date_from?: Date;
  date_to?: Date;
  page?: number;
  limit?: number;
}

export interface TransactionContext {
  id: number;
  farmer_id?: number;
  buyer_id?: number;
  shop_id: number;
  status: string;
}

export interface CreateTransactionRequest {
  farmer_id?: number;
  buyer_id?: number;
  product_name: string;
  quantity: number;
  rate: number;
  total_amount: number;
  commission_amount: number;
}

export interface TransactionStats {
  total_transactions: number;
  total_amount: number;
  total_commission: number;
  pending_amount: number;
  completed_transactions: number;
  farmer_count: number;
  buyer_count: number;
}