// Centralized, typed, grouped endpoint constants.
// Pattern: Base groups + builders for parameterized routes.

type Id = string | number;

export const API_BASE = '/'; // relative base (apiClient adds api prefix if configured)

export const AUTH_ENDPOINTS = {
  BASE: '/auth',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh'
} as const;

export const USER_ENDPOINTS = {
  BASE: '/users',
  BY_ID: (id: Id) => `/users/${id}`,
  RESET_PASSWORD: (id: Id) => `/users/${id}/reset-password`,
  ME: '/users/me'
} as const;

export const SHOP_ENDPOINTS = {
  BASE: '/shops',
  BY_ID: (id: Id) => `/shops/${id}`,
  PRODUCTS: (shopId: Id) => `/shops/${shopId}/products`,
  AVAILABLE_PRODUCTS: (shopId: Id) => `/shops/${shopId}/available-products`,
  ASSIGNABLE_PRODUCTS: (shopId: Id) => `/shops/${shopId}/assignable-products`,
  TRANSACTION_PRODUCTS: (shopId: Id, farmerId?: Id) => `/shops/${shopId}/transaction-products${farmerId ? `?farmerId=${farmerId}` : ''}`,
  PRODUCT_ASSIGN: (shopId: Id, productId: Id) => `/shops/${shopId}/products/${productId}`,
  AVAILABLE_OWNERS: '/shops/available-owners',
  EARNINGS: (shopId: Id) => `/transactions/shop/${shopId}/earnings`,
  TRANSACTIONS_LIST: (shopId: Id) => `/transactions/shop/${shopId}/list`
} as const;

export const CATEGORY_ENDPOINTS = {
  BASE: '/categories',
  ACTIVE: '/categories/active',
  SEARCH: (q: string) => `/categories/search?q=${encodeURIComponent(q)}`
} as const;

export const PRODUCT_ENDPOINTS = {
  BASE: '/products',
  BY_ID: (id: Id) => `/products/${id}`
} as const;

export const COMMISSION_ENDPOINTS = {
  BASE: '/commissions',
  BY_SHOP: (shopId: Id) => `/commissions/shop/${shopId}`,
  CALCULATE: '/commissions/calculate'
} as const;

export const TRANSACTION_ENDPOINTS = {
  BASE: '/transactions',
  ANALYTICS: '/transactions/analytics',
  BY_ID: (id: Id) => `/transactions/${id}`,
  BY_SHOP_LIST: (shopId: Id) => `/transactions?shop_id=${shopId}`,
  BY_FARMER_LIST: (farmerId: Id) => `/transactions?farmer_id=${farmerId}`,
  BY_BUYER_LIST: (buyerId: Id) => `/transactions?buyer_id=${buyerId}`,
  SHOP_BASE: (shopId: Id) => `/transactions/shop/${shopId}`,
  SHOP_EARNINGS: (shopId: Id) => `/transactions/shop/${shopId}/earnings`,
  FARMER_EARNINGS: (farmerId: Id) => `/transactions/farmer/${farmerId}/earnings`,
  BUYER_PURCHASES: (buyerId: Id) => `/transactions/buyer/${buyerId}/purchases`,
  QUICK: '/transactions/quick',
  SETTLEMENT: (id: Id) => `/transactions/${id}/settlement`,
  OFFSET_EXPENSE: (id: Id) => `/transactions/${id}/offset-expense`
} as const;

export const PAYMENT_ENDPOINTS = {
  BASE: '/payments',
  BULK: '/payments/bulk',
  BY_ID: (id: Id) => `/payments/${id}`,
  STATUS: (id: Id) => `/payments/${id}/status`,
  BY_TRANSACTION: (transactionId: Id) => `/payments/transaction/${transactionId}`,
  OUTSTANDING: '/payments/outstanding',
  FARMER: (farmerId: Id) => `/payments/farmers/${farmerId}`,
  BUYER: (buyerId: Id) => `/payments/buyers/${buyerId}`
} as const;

export const BALANCE_ENDPOINTS = {
  BASE: '/balances',
  USER: (id: Id) => `/balances/user/${id}`,
  SHOP: (id: Id) => `/balances/shop/${id}`,
  UPDATE: '/balances/update',
  SNAPSHOTS: '/balance-snapshots',
  SNAPSHOTS_BY_USER: (id: Id) => `/balance-snapshots/user/${id}`
} as const;

export const REPORT_ENDPOINTS = {
  BASE: '/reports',
  TRANSACTIONS: '/reports/transactions',
  SALES: '/reports/sales'
} as const;

export const SETTLEMENT_ENDPOINTS = {
  BASE: '/settlements',
  REPAY_FIFO: '/settlements/repay-fifo',
  SUMMARY: '/settlements/summary'
} as const;

export const SIMPLIFIED_ENDPOINTS = {
  BASE: '/simple',
  TEST: '/simple/test',
  TRANSACTION: '/simple/transaction',
  PAYMENT: '/simple/payment',
  EXPENSE: '/simple/expense',
  BALANCE: (userId: Id) => `/simple/balance/${userId}`
} as const;

export const FARMER_PRODUCT_ENDPOINTS = {
  BASE: '/farmer-products',
  FARMER_PRODUCTS: (farmerId: Id) => `/farmer-products/farmers/${farmerId}/products`,
  ASSIGN_PRODUCT: (farmerId: Id) => `/farmer-products/farmers/${farmerId}/products`,
  SET_DEFAULT: (farmerId: Id, productId: Id) => `/farmer-products/farmers/${farmerId}/products/${productId}/default`
} as const;

export const EXPENSE_ENDPOINTS = {
  BASE: '/expenses',
  BY_ID: (id: Id) => `/expenses/${id}`,
  BY_USER: (userId: Id) => `/expenses?user_id=${userId}`,
  ALLOCATION: (id: Id) => `/expenses/${id}/allocation`
} as const;

export const DASHBOARD_ENDPOINTS = {
  SUPERADMIN: {
    DASHBOARD: '/superadmin/dashboard',
    ACTIVITY: '/superadmin/activity',
    USER_SESSIONS: (userId: number) => `/superadmin/users/${userId}/sessions`,
    RECENT_SHOPS: '/shops?limit=5'
  },
  OWNER: {
    DASHBOARD: '/owner-dashboard/dashboard'
  }
} as const;

// Master export for convenience (optional usage)
export const ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USERS: USER_ENDPOINTS,
  SHOPS: SHOP_ENDPOINTS,
  CATEGORIES: CATEGORY_ENDPOINTS,
  PRODUCTS: PRODUCT_ENDPOINTS,
  COMMISSIONS: COMMISSION_ENDPOINTS,
  TRANSACTIONS: TRANSACTION_ENDPOINTS,
  PAYMENTS: PAYMENT_ENDPOINTS,
  BALANCES: BALANCE_ENDPOINTS,
  REPORTS: REPORT_ENDPOINTS,
  SETTLEMENTS: SETTLEMENT_ENDPOINTS,
  EXPENSES: EXPENSE_ENDPOINTS,
  DASHBOARDS: DASHBOARD_ENDPOINTS
} as const;

export type EndpointGroups = typeof ENDPOINTS;
