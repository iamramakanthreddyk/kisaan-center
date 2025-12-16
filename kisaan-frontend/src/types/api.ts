// Plan type for DRY usage across frontend
export interface Plan {
  id: number;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_users: number;
  max_transactions: number;
  storage_gb: number;
  support_level: string;
  is_popular: boolean;
  is_active: boolean;
}
// Expense type for DRY usage across frontend
export interface Expense {
  id: number;
  shop_id: number;
  user_id: number;
  amount: number;
  type?: string;
  description?: string;
  status?: 'pending' | 'settled';
  transaction_id?: number | null;
  created_at: string;
  updated_at: string;
  user?: User;
  date?: string;
  // Settlement tracking fields
  total_amount?: number;
  allocated_amount?: number;
  remaining_amount?: number;
  allocation_status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
}
// Expense User Summary type
export interface ExpenseUserSummary {
  user_id: number;
  username: string;
  role: string;
  balance: number;
  total_expense_amount: number;
  pending_count: number;
}
// Category type for DRY usage across frontend
export interface Category {
  id: number;
  name: string;
  status?: 'active' | 'inactive';
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
// ...existing code...
// ShopProduct type for DRY usage across frontend
export type ShopProduct = {
  id: number;
  shop_id: number;
  product_id: number;
  product_name: string;
  category?: { id?: number; name?: string };
};
// Balance Snapshot type for DRY usage across frontend
export type BalanceSnapshot = {
  id: number;
  user_id: number;
  balance_type?: 'farmer' | 'buyer';
  previous_balance: number;
  new_balance: number;
  amount_change: number | string;
  transaction_type?: string;
  reference_id?: number;
  reference_type?: string;
  description?: string;
  created_at: string;
  createdAt?: string;
  snapshot_date?: string;
};
// Bulk Payment Types
export interface BulkPaymentItem {
  transaction_id: number;
  amount: number;
}

export interface BulkPaymentRequest {
  payments: BulkPaymentItem[];
  payer_type: 'buyer' | 'shop';
  payee_type: 'shop' | 'farmer';
  method: string;
  status?: string;
  notes?: string;
}
// API Types based on OpenAPI specification
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer';
  shop_id?: number;
  contact?: string;
  email?: string;
  balance: number;
  custom_commission_rate?: number; // Updated to match backend field name
  created_by?: number;
  created_at: string;
  updated_at: string;
  firstname?: string;
  // Computed fields from backend analytics service
  status: 'active' | 'inactive';        // Computed user status
  cumulative_value: number;             // Role-based total value (sales/purchases/commissions)
}

export interface UserCreate {
  username?: string;
  password: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer';
  shop_id?: number;
  contact?: string;
  email?: string;
  status?: 'active' | 'inactive';
  balance?: number; // default 0
  cumulative_value?: number; // default 0
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  custom_commission_rate?: number;
  firstname?: string;
}


export interface Product {
  id: number;
  name: string;
  category_id: number;
  unit?: string;
  description?: string;
  record_status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Shop {
  id: number;
  name: string;
  owner_id: number;
  plan_id?: number;
  address: string;
  contact: string;
  status: 'active' | 'inactive';
  commission_rate?: number;
  created_at: string;
  updated_at?: string;
  category_id?: number; // Added for editing category
}

export interface Transaction {
  id: number;
  shop_id: number;
  farmer_id: number;
  buyer_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;        // Backend field name (was total_sale_value)
  commission_amount: number;   // Backend field name (was shop_commission)
  farmer_earning: number;
  commission_rate?: number;    // percentage form (e.g. 10 for 10%)
  commission_type?: string;    // Added to match backend
  product_id?: number;         // Added to match backend
  status: 'pending' | 'completed' | 'cancelled' | 'to_collect' | 'credit' | 'partial' | 'farmer_due' | 'active';
  transaction_date: string;
  settlement_date?: string;    // Added to match backend
  notes?: string;              // Added to match backend
  metadata?: Record<string, unknown> | null; // Added to match backend
  created_at: string;
  updated_at?: string;
  payments: Payment[];
  // Enriched fields from backend
  deficit?: number;
  buyer_paid?: number;
  farmer_paid?: number;
  farmer_due?: number;
  // Settlement tracking fields
  settled_amount?: number;
  pending_amount?: number;
  settlement_status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
}

export interface TransactionCreate {
  shop_id: number;
  farmer_id: number;
  buyer_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  product_id?: number;
  commission_rate?: number;
  notes?: string;
  transaction_date?: string;
  payments?: Array<{
    payer_type: 'buyer' | 'shop';
    payee_type: 'shop' | 'farmer';
    amount: number;
    method?: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
    status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    payment_date?: string;
    notes?: string;
  }>;
}

// Extended creation payload when frontend supplies derived values explicitly
export interface TransactionCreateExtended extends TransactionCreate {
  commission_rate?: number; // percentage input expected by backend
  total_amount?: number;     // Updated to match backend (was total_sale_value)
  commission_amount?: number; // Updated to match backend (was shop_commission)
  farmer_earning?: number;
  payments?: Array<{
    payer_type: 'buyer' | 'shop';
    payee_type: 'shop' | 'farmer';
    amount: number;
    status: 'PAID' | 'PENDING';
    method: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
    payment_date: string;
    notes?: string;
  }>;
}

export interface Payment {
  id: number;
  transaction_id: number;
  payer_type: 'buyer' | 'shop';
  payee_type: 'shop' | 'farmer';
  // Backend may return amount as formatted string ("71.00") or number. Accept both.
  amount: number | string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payment_date?: string;
  method: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Settlement breakdown fields returned by payment API
  applied_to_expenses?: number;
  applied_to_balance?: number;
  fifo_result?: {
    settlements?: {
      expense_id: number;
      amount_settled: number;
      expense_date?: string;
      reason?: string;
    }[];
    remaining?: number;
  };
  // Additional fields returned by backend
  amount_cents?: number;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  settlement_type?: string | null;
  settled_transactions?: unknown[];
  settled_expenses?: unknown[];
  counterparty_id?: number | null;
  shop_id?: number | null;
}

// Settlement Tracking Types
export interface TransactionSettlement {
  id: number;
  transaction_id: number;
  settlement_type: 'PAYMENT' | 'EXPENSE_OFFSET' | 'CREDIT_OFFSET' | 'ADJUSTMENT';
  payment_id?: number;
  expense_id?: number;
  credit_id?: number;
  amount: number;
  settled_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface ExpenseAllocation {
  id: number;
  expense_id: number;
  allocation_type: 'TRANSACTION_OFFSET' | 'BALANCE_SETTLEMENT' | 'ADVANCE_PAYMENT';
  transaction_id?: number;
  transaction_settlement_id?: number;
  allocated_amount: number;
  allocation_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface TransactionSettlementDetail {
  transaction_id: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
  settlement_status: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
  settlements: Array<{
    settlement_type: string;
    amount: number;
    settled_date: string;
    payment_id?: number;
    expense_id?: number;
    notes?: string;
  }>;
}

export interface ExpenseAllocationDetail {
  expense_id: number;
  total_amount: number;
  allocated_amount: number;
  remaining_amount: number;
  allocation_status: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  allocations: Array<{
    allocation_type: string;
    allocated_amount: number;
    allocation_date: string;
    transaction_id?: number;
    notes?: string;
  }>;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
}

// Dashboard Types
export interface BusinessSummary {
  totalUsers: number;
  totalTransactions: number;
  totalPayments: number;
  totalRevenue: number;
  activeShops: number;
  pendingPayments: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_value: number;
  total_commission: number;
  pending_count: number;
  completed_count: number;
  average_transaction_value: number;
}

// Farmer Payments Expenses type
export interface FarmerPaymentsExpenses {
  totalExpenses: number;
  totalSettled: number;
  totalUnsettled: number;
  expenses: Array<{
    id: number;
    amount: number;
    settled: number;
    unsettled: number;
    description: string;
    created_at: string;
    status: string;
  }>;
}

// Login Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}