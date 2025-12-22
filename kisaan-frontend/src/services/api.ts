// Centralized API service layer
import { apiClient } from './apiClient';
import { TRANSACTION_ENDPOINTS, USER_ENDPOINTS, CATEGORY_ENDPOINTS, PRODUCT_ENDPOINTS, SHOP_ENDPOINTS, PAYMENT_ENDPOINTS, BALANCE_ENDPOINTS, REPORT_ENDPOINTS, EXPENSE_ENDPOINTS, DASHBOARD_ENDPOINTS, SIMPLIFIED_ENDPOINTS, FARMER_PRODUCT_ENDPOINTS } from './endpoints';
// Helper utilities centralizing query string construction & list response normalization
import { buildQueryString, normalizeListResponse, normalizeSingleItemResponse } from './serviceHelpers';
import { buildTransactionPayload } from '../utils/buildTransactionPayload';
import type { BuildTransactionInput } from '../utils/buildTransactionPayload';
import type {
  User,
  UserCreate,
  Category,
  Product,
  Shop,
  Transaction,
  TransactionCreate,
  Payment,
  Expense,
  ApiResponse,
  PaginatedResponse,
  BusinessSummary,
  TransactionSummary,
  LoginRequest,
  LoginResponse,
  TransactionSettlement,
  ExpenseAllocation,
  TransactionSettlementDetail,
  ExpenseAllocationDetail,
  LedgerEntry,
  LedgerSummary,
  FarmerPaymentsExpenses
} from '../types/api';

// Commissions API
export const commissionsApi = {
  getByShopId: async (shop_id: number | string) => {
    const resp = await apiClient.get<ApiResponse<{ rate: number }[]>>(`/commissions?shop_id=${shop_id}`);
    return resp.data || [];
  }
};
// (config import removed after refactor eliminating direct fetch usage)
// Settlements API
// Removed settlementsApi - settlements functionality removed
export const shopProductsApi = {
  getShops: async (user: User | null) => {
    if (user?.role === 'owner' && user?.shop_id) {
      const single = await apiClient.get<ApiResponse<Shop>>(SHOP_ENDPOINTS.BY_ID(user.shop_id));
      return single?.data ? [single.data] : [];
    }
    const resp = await apiClient.get<ApiResponse<Shop[]>>(SHOP_ENDPOINTS.BASE);
    return resp.data || [];
  },
  getCategories: async () => {
    const resp = await apiClient.get<ApiResponse<Category[]>>(CATEGORY_ENDPOINTS.BASE);
    const categories = resp.data || [];
    // Note: status field removed from category model, return all categories
    return categories;
  },
  getProducts: async (categoryId: number) => {
    const resp = await apiClient.get<ApiResponse<Product[]>>(`${PRODUCT_ENDPOINTS.BASE}${buildQueryString({ category_id: categoryId })}`);
    const products = resp.data || [];
    return products.filter((p) => p.record_status === 'active');
  },
  getShopProducts: async (shopId: number) => {
    // Always return backend data array as-is, preserving all fields (unit, description, etc)
    const resp = await apiClient.get<ApiResponse<Product[]>>(SHOP_ENDPOINTS.PRODUCTS(shopId));
    return resp.data || [];
  },
  getAvailableProducts: async (shopId: number) => {
  const resp = await apiClient.get<ApiResponse<Product[]>>(SHOP_ENDPOINTS.AVAILABLE_PRODUCTS(shopId));
  return resp.data || [];
  },
  getAssignableProducts: async (shopId: number, farmerId: number) => {
    // Backend should support: /shops/:shopId/assignable-products?farmerId=123
    const resp = await apiClient.get<ApiResponse<unknown[]>>(`/shops/${shopId}/assignable-products?farmerId=${farmerId}`);
    // Type guard for ShopProductMapped
    const isShopProductMapped = (p: unknown): p is {
      id: number;
      shop_id: number;
      product_id: number;
      product_name?: string;
      name?: string;
      category?: string;
      category_name?: string;
      is_active?: boolean;
      category_id?: number;
      record_status?: string;
    } => typeof p === 'object' && p !== null && 'id' in p && 'shop_id' in p && 'product_id' in p;
    // Map to ShopProductMapped type for frontend compatibility
    return (resp.data || []).filter(isShopProductMapped).map((p) => ({
      id: p.id,
      shop_id: p.shop_id,
      product_id: p.product_id,
      product_name: p.product_name || p.name,
      category: p.category,
      category_name: p.category_name,
      is_active: p.is_active,
      category_id: p.category_id,
      record_status: p.record_status
    }));
  },
  getTransactionProducts: async (shopId: number, farmerId?: number) => {
  const resp = await apiClient.get<ApiResponse<Product[]>>(SHOP_ENDPOINTS.TRANSACTION_PRODUCTS(shopId, farmerId));
  return resp.data || [];
  },
  assignProduct: (shopId: number, productId: number) =>
    apiClient.post(SHOP_ENDPOINTS.PRODUCT_ASSIGN(shopId, productId)),
  removeProduct: (shopId: number, productId: number) =>
    apiClient.delete(SHOP_ENDPOINTS.PRODUCT_ASSIGN(shopId, productId)),
    toggleProductStatus: (shopId: number, productId: number, isActive: boolean) =>
      apiClient.patch(SHOP_ENDPOINTS.PRODUCT_ASSIGN(shopId, productId), { is_active: !isActive })
};
// Balance Snapshots API
export const balanceSnapshotsApi = {
  getByUserId: async (userId: number | string) => {
    const resp = await apiClient.get<ApiResponse<{
      id: number;
      user_id: number;
      balance_type: 'farmer' | 'buyer';
      previous_balance: number;
      amount_change: number | string;
      new_balance: number;
      transaction_type: string;
      reference_id?: number;
      reference_type?: string;
      description?: string;
      created_at: string;
    }[]>>(BALANCE_ENDPOINTS.SNAPSHOTS_BY_USER(userId));
    // Return all snapshots without filtering - let the UI decide what to display
    return resp.data || [];
  }
};
// Superadmin Dashboard API
export const superadminDashboardApi = {
  getDashboard: async () => apiClient.get(DASHBOARD_ENDPOINTS.SUPERADMIN.DASHBOARD),
  getRecentShops: async () => {
  const resp = await apiClient.get<ApiResponse<Shop[]>>(`${SHOP_ENDPOINTS.BASE}${buildQueryString({ limit: 5 })}`);
  return resp.data || [];
  }
};
// Owner Dashboard API
export const ownerDashboardApi = {
  getStats: async () => apiClient.get(DASHBOARD_ENDPOINTS.OWNER.DASHBOARD)
};
// Transaction Form Data API
export const getTransactionFormData = async () => {
  // Fetch all required data in parallel
  const [farmersRes, buyersRes, productsRes, categoriesRes] = await Promise.all([
    usersApi.getAll({ role: 'farmer' }),
    usersApi.getAll({ role: 'buyer' }),
    productsApi.getAll(),
    categoriesApi.getAll()
  ]);
  return {
    farmers: farmersRes.data,
    buyers: buyersRes.data,
    products: productsRes.data,
    categories: categoriesRes.data
  };
};

// Authentication API
export const authApi = {
  login: (credentials: LoginRequest): Promise<LoginResponse> =>
    apiClient.post('/auth/login', credentials), // could use AUTH_ENDPOINTS if imported
  
  logout: (): Promise<ApiResponse> =>
    apiClient.post('/auth/logout'),
  
  getCurrentUser: (): Promise<ApiResponse<User>> =>
    apiClient.get(USER_ENDPOINTS.ME)
};

// Users API
export const usersApi = {
  getAll: async (params?: {
    role?: string;
    status?: string;
    shop_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> => {
    const qs = buildQueryString(params);
    const raw = await apiClient.get<ApiResponse<User[]>>(`${USER_ENDPOINTS.BASE}${qs}`);
    // Extract meta from response
    const meta = (raw && typeof raw === 'object' && 'meta' in raw) ? (raw as { meta: unknown }).meta : {};
    const metaObj = (meta && typeof meta === 'object') ? meta as Record<string, unknown> : {};
    const normalized = normalizeListResponse<User>(raw, {
      keys: ['data'],
      limit: typeof metaObj.limit === 'number' ? metaObj.limit : params?.limit,
      page: typeof metaObj.page === 'number' ? metaObj.page : params?.page,
      // total and totalPages will be inferred from meta if present
    });
    return normalized;
  },
  
  getById: (id: number): Promise<{ message: string; user: User }> =>
    apiClient.get(USER_ENDPOINTS.BY_ID(id)),
  
  create: async (user: UserCreate): Promise<ApiResponse<User>> => {
  const raw = await apiClient.post<ApiResponse<User>>(USER_ENDPOINTS.BASE, user);
  const normalizedUser = normalizeSingleItemResponse<User>(raw, 'user');
    return {
      success: raw.success || true,
      message: raw.message || 'User created successfully',
      data: normalizedUser || undefined
    };
  },
  
  update: async (id: number, user: Partial<User>): Promise<ApiResponse<User>> => {
  const raw = await apiClient.put<ApiResponse<User>>(USER_ENDPOINTS.BY_ID(id), user);
  const normalizedUser = normalizeSingleItemResponse<User>(raw, 'user');
    return {
      success: raw.success || true,
      message: raw.message || 'User updated successfully',
      data: normalizedUser || undefined
    };
  },
  
  delete: (id: number): Promise<ApiResponse> =>
    apiClient.delete(USER_ENDPOINTS.BY_ID(id)),
  
  resetPassword: (id: number, passwords: { currentPassword: string; newPassword: string }): Promise<ApiResponse> =>
    apiClient.post(USER_ENDPOINTS.RESET_PASSWORD(id), passwords),

  /**
   * Superadmin: reset any user's password (admin endpoint)
   */
  adminResetPassword: (id: number, newPassword: string): Promise<ApiResponse> =>
    apiClient.post(`/users/${id}/admin-reset-password`, { newPassword })
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    const response = await apiClient.get(CATEGORY_ENDPOINTS.BASE) as ApiResponse<Category[]> | { categories?: Category[] } | Category[];
    let data: Category[] = [];
    if (Array.isArray(response)) {
      data = response;
    } else if ('categories' in response && Array.isArray(response.categories)) {
      data = response.categories;
    } else if ('data' in response && Array.isArray(response.data)) {
      data = response.data;
    }
    return {
      success: true,
      message: 'Categories fetched',
      data
    };
  },
  
  getActive: async (): Promise<ApiResponse<Category[]>> => {
    // Note: /categories/active endpoint removed, using same as getAll
    const response = await apiClient.get(CATEGORY_ENDPOINTS.BASE) as ApiResponse<Category[]> | { categories?: Category[] } | Category[];
    let data: Category[] = [];
    if (Array.isArray(response)) {
      data = response;
    } else if ('categories' in response && Array.isArray(response.categories)) {
      data = response.categories;
    } else if ('data' in response && Array.isArray(response.data)) {
      data = response.data;
    }
    return {
      success: true,
      message: 'Active categories fetched',
      data
    };
  },
  
  search: (query: string): Promise<ApiResponse<Category[]>> =>
    apiClient.get(CATEGORY_ENDPOINTS.SEARCH(query)),
  
  getById: (id: number): Promise<ApiResponse<Category>> =>
    apiClient.get(`${CATEGORY_ENDPOINTS.BASE}/${id}`),
  
  create: (category: { name: string; status?: string }): Promise<ApiResponse<Category>> =>
    apiClient.post(CATEGORY_ENDPOINTS.BASE, category),
  
  update: (id: number, category: { name: string; status?: string }): Promise<ApiResponse<Category>> =>
    apiClient.put(`${CATEGORY_ENDPOINTS.BASE}/${id}`, category),
  
  delete: (id: number): Promise<ApiResponse> =>
    apiClient.delete(`${CATEGORY_ENDPOINTS.BASE}/${id}`)
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    category_id?: number;
    record_status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> => {
    const qs = buildQueryString(params);
  const raw = await apiClient.get(`${PRODUCT_ENDPOINTS.BASE}${qs}`) as ApiResponse<Product[]> | { products?: Product[] } | Product[];
    return normalizeListResponse<Product>(raw, { keys: ['data'], limit: params?.limit, page: params?.page });
  },
  
  getById: (id: number): Promise<ApiResponse<Product>> =>
    apiClient.get(PRODUCT_ENDPOINTS.BY_ID(id)),
  
  create: (product: { name: string; category_id: number; record_status?: string }): Promise<ApiResponse<Product>> =>
    apiClient.post(PRODUCT_ENDPOINTS.BASE, product),
  
  update: (id: number, product: { name: string; category_id: number; record_status?: string }): Promise<ApiResponse<Product>> =>
    apiClient.put(PRODUCT_ENDPOINTS.BY_ID(id), product),
  
  delete: (id: number): Promise<ApiResponse> =>
    apiClient.delete(PRODUCT_ENDPOINTS.BY_ID(id))
};

// Shops API
export const shopsApi = {
  getAvailableOwners: async () => {
    try {
      // Try the dedicated endpoint first
      const raw = await apiClient.get<ApiResponse<User[]>>(SHOP_ENDPOINTS.AVAILABLE_OWNERS);
      const normalized = normalizeListResponse<User>(raw, { keys: ['data'] });
      return normalized.data;
    } catch {
      console.warn('Available owners endpoint not found, falling back to filtering all users');
      // Fallback: Get all owners and filter out those who already have shops
      try {
        const [usersResponse, shopsResponse] = await Promise.all([
          usersApi.getAll({ role: 'owner' }),
          shopsApi.getAll()
        ]);
        const allOwners = usersResponse.data || [];
        const allShops = shopsResponse.data || [];
        const ownersWithShops = new Set(allShops.map(shop => shop.owner_id).filter(Boolean));
        // Return owners who don't have shops yet
        return allOwners.filter(owner => !ownersWithShops.has(owner.id));
      } catch {
        // fallback error
        return [];
      }
    }
  },
  getAll: async (params?: {
    status?: string;
    owner_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Shop>> => {
  const qs = buildQueryString(params);
  const raw = await apiClient.get<ApiResponse<Shop[]>>(`${SHOP_ENDPOINTS.BASE}${qs}`);
  return normalizeListResponse<Shop>(raw, { keys: ['data'], limit: params?.limit, page: params?.page });
  },
  
  getById: (id: number): Promise<ApiResponse<Shop>> =>
    apiClient.get(SHOP_ENDPOINTS.BY_ID(id)),
  
  create: (shop: { name: string; owner_id: number; address: string; contact: string; plan_id?: number }): Promise<ApiResponse<Shop>> =>
    apiClient.post(SHOP_ENDPOINTS.BASE, shop),
  
  update: (id: number, shop: Partial<Shop>): Promise<ApiResponse<Shop>> =>
    apiClient.put(SHOP_ENDPOINTS.BY_ID(id), shop),
  
  delete: (id: number): Promise<ApiResponse> =>
    apiClient.delete(SHOP_ENDPOINTS.BY_ID(id)),
  
  getProducts: (id: number): Promise<ApiResponse<Product[]>> =>
    apiClient.get(SHOP_ENDPOINTS.PRODUCTS(id)),
  
  assignProduct: (shopId: number, productId: number): Promise<ApiResponse> =>
    apiClient.post(SHOP_ENDPOINTS.PRODUCT_ASSIGN(shopId, productId)),
  
  removeProduct: (shopId: number, productId: number): Promise<ApiResponse> =>
    apiClient.delete(SHOP_ENDPOINTS.PRODUCT_ASSIGN(shopId, productId))
};

// Transactions API
export const transactionsApi = {
  getAll: async (params?: {
    shop_id?: number;
    farmer_id?: number;
    buyer_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Transaction>> => {
    const qs = buildQueryString(params);
  try {
    const raw = await apiClient.get<ApiResponse<Transaction[]>>(`${TRANSACTION_ENDPOINTS.BASE}${qs}`);
    return normalizeListResponse<Transaction>(raw, { keys: ['data'], limit: params?.limit, page: params?.page });
  } catch (err: unknown) {
    // Network or server error - provide a clear message for UI
    const msg = err instanceof Error ? err.message : 'Server error';
    throw new Error(`Unable to load transactions: ${msg}`);
  }
  },
  
  getById: (id: number): Promise<ApiResponse<Transaction>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.BY_ID(id)),
  
  create: (transaction: TransactionCreate): Promise<ApiResponse<Transaction>> =>
    apiClient.post(TRANSACTION_ENDPOINTS.BASE, transaction),

  // Enhanced: Create backdated transaction (owner only)
  createBackdated: (transaction: TransactionCreate & { transaction_date: string }): Promise<ApiResponse<Transaction>> =>
    apiClient.post(`${TRANSACTION_ENDPOINTS.BASE}/backdated`, transaction),

  // Enhanced: Add backdated payments to existing transaction (owner only)  
  addBackdatedPayments: (transactionId: number, payments: {
    payments: Array<{
      payer_type: 'buyer' | 'shop';
      payee_type: 'shop' | 'farmer';
      amount: number;
      method?: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
      payment_date: string;
      notes?: string;
    }>;
  }): Promise<ApiResponse<Transaction>> =>
    apiClient.post(`${TRANSACTION_ENDPOINTS.BASE}/${transactionId}/payments/backdated`, payments),

  // New helper: build payload from raw input using centralized builder
  createFromInput: (input: BuildTransactionInput): Promise<ApiResponse<Transaction>> => {
    const payload = buildTransactionPayload(input);
    return apiClient.post(TRANSACTION_ENDPOINTS.BASE, payload);
  },
  
  getByShop: (shopId: number): Promise<PaginatedResponse<Transaction>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.SHOP_BASE(shopId)),
  
  getShopEarnings: (shopId: number): Promise<ApiResponse<TransactionSummary>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.SHOP_EARNINGS(shopId)),
  
  getFarmerEarnings: (farmerId: number): Promise<ApiResponse<TransactionSummary>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.FARMER_EARNINGS(farmerId)),
  
  getBuyerPurchases: (buyerId: number): Promise<PaginatedResponse<Transaction>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.BUYER_PURCHASES(buyerId)),
  
  // Settlement tracking methods
  getSettlement: (id: number): Promise<ApiResponse<TransactionSettlementDetail>> =>
    apiClient.get(TRANSACTION_ENDPOINTS.SETTLEMENT(id)),
  
  offsetExpense: (transactionId: number, payload: {
    expense_id: number;
    amount: number;
    notes?: string;
  }): Promise<ApiResponse<{
    allocation: ExpenseAllocation;
    settlement: TransactionSettlement;
    transaction: Transaction;
    expense: Expense;
  }>> =>
    apiClient.post(TRANSACTION_ENDPOINTS.OFFSET_EXPENSE(transactionId), payload)
};

// Payments API
export const paymentsApi = {
  createBulk: (bulk: {
    payments: { transaction_id: number; amount: number }[];
    payer_type: 'buyer' | 'shop' | 'farmer';
    payee_type: 'shop' | 'farmer';
    method: string;
    status?: string;
    notes?: string;
  }): Promise<ApiResponse<Payment[]>> =>
    apiClient.post(PAYMENT_ENDPOINTS.BULK, bulk),
  getAll: (params?: {
    transaction_id?: number;
    status?: string;
    payer_type?: string;
    payee_type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Payment>> =>
    (async () => {
      const qs = buildQueryString(params);
  const raw = await apiClient.get<ApiResponse<Payment[]>>(`${PAYMENT_ENDPOINTS.BASE}${qs}`);
  return normalizeListResponse<Payment>(raw, { keys: ['data'], limit: params?.limit, page: params?.page });
    })(),
  
  getById: (id: number): Promise<ApiResponse<Payment>> =>
    apiClient.get(PAYMENT_ENDPOINTS.BY_ID(id)),
  
  create: (payment: {
    transaction_id?: number;
    payer_type: 'buyer' | 'shop' | 'farmer';
    payee_type: 'shop' | 'farmer';
    amount: number;
    method?: string;
    notes?: string;
    payment_date?: string;
  }): Promise<ApiResponse<Payment>> =>
    apiClient.post(PAYMENT_ENDPOINTS.BASE, payment),
  
  updateStatus: (id: number, update: {
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    payment_date?: string;
    notes?: string;
  }): Promise<ApiResponse<Payment>> =>
    apiClient.put(PAYMENT_ENDPOINTS.STATUS(id), update),
  
  getByTransaction: (transactionId: number): Promise<ApiResponse<Payment[]>> =>
    apiClient.get(PAYMENT_ENDPOINTS.BY_TRANSACTION(transactionId)),
  
  getOutstanding: (): Promise<PaginatedResponse<Payment>> =>
    apiClient.get(PAYMENT_ENDPOINTS.OUTSTANDING),
  
  // Note: backend may return an enhanced payload { payments, expenses }.
  // We return the raw payload when expenses are present so callers can access them.
  getFarmerPayments: async (farmerId: number): Promise<PaginatedResponse<Payment> | {
    data: Payment[] | { payments: Payment[]; expenses: unknown };
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> => {
    const raw = await apiClient.get<ApiResponse<Payment[] | { payments: Payment[]; expenses: FarmerPaymentsExpenses }>>(PAYMENT_ENDPOINTS.FARMER(farmerId));
    // If backend returned the enhanced shape with expenses, return it directly
    if (raw && raw.success && raw.data && typeof raw.data === 'object' && 'expenses' in raw.data) {
      // Convert enhanced backend shape to the declared return shape
      const paymentsArr = Array.isArray((raw.data as { payments: Payment[]; expenses: FarmerPaymentsExpenses }).payments) ? (raw.data as { payments: Payment[]; expenses: FarmerPaymentsExpenses }).payments : [];
      return {
        data: raw.data as { payments: Payment[]; expenses: FarmerPaymentsExpenses },
        page: 1,
        limit: paymentsArr.length,
        total: (raw.data as { payments: Payment[]; expenses: FarmerPaymentsExpenses; totalPayments?: number }).totalPayments || paymentsArr.length,
        totalPages: 1
      };
    }
    // Legacy: { success: true, data: { payments: [...] } } or { success: true, data: [...] }
    if (raw && raw.success && raw.data && Array.isArray((raw.data as { payments?: Payment[] }).payments)) {
      return {
        data: (raw.data as { payments: Payment[] }).payments,
        page: 1,
        limit: (raw.data as { payments: Payment[] }).payments.length,
        total: (raw.data as { totalPayments?: number }).totalPayments || (raw.data as { payments: Payment[] }).payments.length,
        totalPages: 1
      } as PaginatedResponse<Payment>;
    }
    return normalizeListResponse<Payment>(raw, { keys: ['data'] });
  },
  
  getBuyerPayments: async (buyerId: number): Promise<PaginatedResponse<Payment>> => {
    const raw = await apiClient.get<ApiResponse<{ payments: Payment[]; totalPayments: number; totalPaid: number }>>(PAYMENT_ENDPOINTS.BUYER(buyerId));
    // Handle the specific response structure: { success: true, data: { payments: [...], totalPayments: ..., totalPaid: ... } }
    if (raw.success && raw.data && Array.isArray(raw.data.payments)) {
      return {
        data: raw.data.payments,
        page: 1,
        limit: raw.data.payments.length,
        total: raw.data.totalPayments,
        totalPages: 1
      };
    }
    return normalizeListResponse<Payment>(raw, { keys: ['data'] });
  }
};

// Expense API
export const expenseApi = {
  addExpense: (payload: { shop_id: number; user_id: number; amount: number; reason?: string; description?: string; }): Promise<ApiResponse> =>
    apiClient.post(EXPENSE_ENDPOINTS.BASE, payload),
  getExpenses: (shop_id: number): Promise<ApiResponse<{ id: number; shop_id: number; user_id: number; amount: number; reason?: string; description?: string; status?: 'pending' | 'settled'; created_at: string; updated_at: string; }[]>> =>
    apiClient.get<ApiResponse<{ id: number; shop_id: number; user_id: number; amount: number; reason?: string; description?: string; status?: 'pending' | 'settled'; created_at: string; updated_at: string; }[]>>(`${EXPENSE_ENDPOINTS.BASE}${buildQueryString({ shop_id })}`),
  getExpenseSummary: (shop_id: number): Promise<ApiResponse<{ user_id: number; username: string; role: string; balance: number; total_expense_amount: number; pending_count: number; }[]>> =>
    apiClient.get<ApiResponse<{ user_id: number; username: string; role: string; balance: number; total_expense_amount: number; pending_count: number; }[]>>(`${EXPENSE_ENDPOINTS.BASE}/summary${buildQueryString({ shop_id })}`),
  
  // Allocation tracking method
  getAllocation: (id: number): Promise<ApiResponse<ExpenseAllocationDetail>> =>
    apiClient.get(EXPENSE_ENDPOINTS.ALLOCATION(id))
};

// Dashboard API - using available endpoints
export const dashboardApi = {
  getBusinessSummary: async (): Promise<ApiResponse<BusinessSummary>> => {
    // Use transactions analytics to build summary
  const transactionsRes = await apiClient.get<ApiResponse<TransactionSummary>>(TRANSACTION_ENDPOINTS.ANALYTICS);
  const usersRes = await apiClient.get<ApiResponse<User[]>>(USER_ENDPOINTS.BASE);
  const shopsRes = await apiClient.get<ApiResponse<Shop[]>>(SHOP_ENDPOINTS.BASE);
    return {
      success: true,
      message: 'Business summary',
      data: {
        totalUsers: usersRes.data?.length || 0,
  totalTransactions: transactionsRes.data?.total_transactions || 0,
        totalPayments: 0,
        totalRevenue: transactionsRes.data?.total_value || 0,
        activeShops: shopsRes.data?.filter((s: Shop) => s.status === 'active').length || 0,
        pendingPayments: 0
      }
    };
  },
  
  getRecentTransactions: (limit?: number): Promise<ApiResponse<Transaction[]>> =>
    apiClient.get(`${TRANSACTION_ENDPOINTS.BASE}${buildQueryString(limit ? { limit } : undefined)}`)
};

// Balance API
export const balanceApi = {
  getUserBalance: (id: number): Promise<ApiResponse<{ user_id: number; username: string; role: string; current_balance: number; pending_expenses: number; effective_balance: number }>> =>
    apiClient.get(BALANCE_ENDPOINTS.USER(id)),
  
  getShopBalance: (id: number): Promise<ApiResponse<{ balance: number }>> =>
    apiClient.get(BALANCE_ENDPOINTS.SHOP(id)),
  
  updateBalance: (update: {
    amount: number;
    operation: 'add' | 'subtract' | 'set';
    reason?: string;
  }): Promise<ApiResponse> =>
    apiClient.post(BALANCE_ENDPOINTS.UPDATE, update)
};

// Reports API - using available endpoints
export const reportsApi = {
  getSales: (params?: { from_date?: string; to_date?: string }): Promise<ApiResponse> =>
    apiClient.get(`${REPORT_ENDPOINTS.SALES}${buildQueryString(params)}`),

  getTransactions: (params?: { from_date?: string; to_date?: string }): Promise<ApiResponse> =>
    apiClient.get(`${REPORT_ENDPOINTS.TRANSACTIONS}${buildQueryString(params)}`),

  getSuperadminDashboard: (): Promise<ApiResponse> =>
    apiClient.get('/superadmin/dashboard')
};

// Analytics API - using transaction analytics endpoint
export const analyticsApi = {
  getShopAnalytics: (shopId: number, dateRange?: { from?: string; to?: string }): Promise<ApiResponse> =>
    apiClient.get(`${TRANSACTION_ENDPOINTS.ANALYTICS}${buildQueryString({ shop_id: shopId, date_from: dateRange?.from, date_to: dateRange?.to })}`),

  getPlatformAnalytics: (dateRange?: { from?: string; to?: string }): Promise<ApiResponse> =>
    apiClient.get(`${TRANSACTION_ENDPOINTS.ANALYTICS}${buildQueryString({ date_from: dateRange?.from, date_to: dateRange?.to })}`)
};

// Simplified Transaction API - Easy to use endpoints
export const simplifiedApi = {
  // Test connection
  test: (): Promise<ApiResponse<{ message: string; timestamp: string }>> =>
    apiClient.get(SIMPLIFIED_ENDPOINTS.TEST),

  // Get user balance with clear explanation
  getBalance: (userId: number): Promise<ApiResponse<{
    user_id: number;
    username: string;
    role: string;
    balance: number;
    balance_meaning: string;
  }>> =>
    apiClient.get(SIMPLIFIED_ENDPOINTS.BALANCE(userId)),

  // Create transaction with automatic balance updates
  createTransaction: (data: {
    shop_id: number;
    farmer_id: number;
    buyer_id: number;
    category_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    commission_rate?: number;
    transaction_date?: string;
    notes?: string;
    payments?: Array<{
      payer_type: 'buyer' | 'shop';
      payee_type: 'shop' | 'farmer';
      amount: number;
      method: string;
      status?: string;
      payment_date?: string;
      notes?: string;
    }>;
  }): Promise<ApiResponse<{
  transaction: Record<string, unknown>;
  payments?: Record<string, unknown>[];
    balance_updates: {
      farmer: { old_balance: number; new_balance: number };
    };
  }>> =>
    apiClient.post(SIMPLIFIED_ENDPOINTS.TRANSACTION, data),

  // Record payment to reduce user balance
  recordPayment: (data: {
    user_id: number;
    amount: number;
    payment_type: 'farmer_payment' | 'buyer_payment';
    notes?: string;
  }): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.post(SIMPLIFIED_ENDPOINTS.PAYMENT, data),

  // Record expense or advance
  recordExpense: (data: {
    user_id: number;
    amount: number;
    expense_type: 'shop_expense' | 'user_advance';
    description: string;
    shop_id: number;
  }): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.post(SIMPLIFIED_ENDPOINTS.EXPENSE, data)
};

// Farmer Product API - for farmer-specific product assignments
export const farmerProductApi = {
  // Get farmer's assigned products with prices
  getFarmerProducts: async (farmerId: number): Promise<ApiResponse<Product[]>> => {
    try {
      const raw = await apiClient.get<ApiResponse<Product[]>>(FARMER_PRODUCT_ENDPOINTS.FARMER_PRODUCTS(farmerId));
      let data: Product[] = [];
      if (Array.isArray(raw)) {
        data = raw as Product[];
      } else if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
        data = (raw as { data: Product[] }).data;
      }
      return {
        success: true,
        message: 'Farmer products fetched',
        data
      };
    } catch (err) {
      console.warn(`Error fetching farmer products for ${farmerId}:`, err);
      return {
        success: false,
        message: 'Failed to fetch farmer products',
        data: []
      };
    }
  },

  // Assign product to farmer
  assignProduct: (farmerId: number, productId: number, makeDefault?: boolean): Promise<ApiResponse<Product>> =>
    apiClient.post<ApiResponse<Product>>(FARMER_PRODUCT_ENDPOINTS.ASSIGN_PRODUCT(farmerId), { 
      product_id: productId, 
      make_default: makeDefault 
    }),

  // Set product as default for farmer
  setDefault: (farmerId: number, productId: number): Promise<ApiResponse<Product>> =>
  apiClient.put<ApiResponse<Product>>(FARMER_PRODUCT_ENDPOINTS.SET_DEFAULT(farmerId, productId))
};

// Simple Ledger API - for farmer ledger tracking
export const simpleLedgerApi = {
  // Get ledger entries
  getEntries: async (params?: {
    shop_id?: string;
    farmer_id?: string;
    from?: string;
    to?: string;
    category?: string;
  }): Promise<LedgerEntry[]> => {
    const qs = buildQueryString(params);
    const response = await apiClient.get<LedgerEntry[] | ApiResponse<LedgerEntry[]>>(`/simple-ledger${qs}`);
    
    // Handle both direct array response and wrapped response
    if (Array.isArray(response)) {
      return response;
    }
    return (response as ApiResponse<LedgerEntry[]>).data || [];
  },

  // Get ledger summary
  getSummary: async (params?: {
    shop_id?: string;
    farmer_id?: string;
    period?: 'weekly' | 'monthly';
    from?: string;
    to?: string;
    category?: string;
  }): Promise<LedgerSummary[]> => {
    const qs = buildQueryString(params);
    const response = await apiClient.get<LedgerSummary[] | ApiResponse<LedgerSummary[]>>(`/simple-ledger/summary${qs}`);
    
    // Handle both direct array response and wrapped response
    if (Array.isArray(response)) {
      return response;
    }
    return (response as ApiResponse<LedgerSummary[]>).data || [];
  },

  // Get farmer balance
  getBalance: async (shopId: string, farmerId: string): Promise<{
    farmer_id: number;
    shop_id: number;
    credit: number;
    debit: number;
    balance: number;
  }> => {
    const response = await apiClient.get<ApiResponse<{
      farmer_id: number;
      shop_id: number;
      credit: number;
      debit: number;
      balance: number;
    }>>(`/simple-ledger/balance?shop_id=${shopId}&farmer_id=${farmerId}`);
    return response.data!;
  },

  // Create ledger entry
  createEntry: async (data: {
    shop_id: string;
    farmer_id: string;
    type: 'credit' | 'debit';
    category: string;
    amount: number;
    notes?: string;
  }): Promise<LedgerEntry> => {
    const response = await apiClient.post<ApiResponse<LedgerEntry>>('/simple-ledger', data);
    return response.data!;
  },

  // Export CSV
  exportCsv: async (params?: {
    shop_id?: string;
    farmer_id?: string;
    from?: string;
    to?: string;
    category?: string;
  }): Promise<Blob> => {
    const qs = buildQueryString(params);
    return apiClient.fetchBlob(`/simple-ledger/export${qs}`);
  }
};