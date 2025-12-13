/**
 * Updated User Role Constants
 * Must match enum_kisaan_users_role in database
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  FARMER: 'farmer',
  BUYER: 'buyer'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Updated User Status Constants
 * Must match enum_kisaan_users_status in database
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'  // Added missing status
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

/**
 * Shop Status Constants
 * Must match enum_kisaan_shops_status in database
 */
export const SHOP_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const;

export type ShopStatus = typeof SHOP_STATUS[keyof typeof SHOP_STATUS];

/**
 * Payment Constants
 * Must match payment-related enums in database
 */
export const PAYMENT_PAYER_TYPE = {
  FARMER: 'farmer',
  BUYER: 'buyer',
  SHOP: 'shop',
  EXTERNAL: 'external'
} as const;

export const PAYMENT_PAYEE_TYPE = {
  FARMER: 'farmer',
  BUYER: 'buyer',
  SHOP: 'shop',
  EXTERNAL: 'external'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

export const PAYMENT_METHOD = {
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  CHEQUE: 'cheque'
} as const;

/**
 * Commission Type Constants
 */
export const COMMISSION_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed'
} as const;

/**
 * Credit Status Constants
 */
export const CREDIT_STATUS = {
  ACTIVE: 'active',
  REPAID: 'repaid',
  OVERDUE: 'overdue',
  WRITTEN_OFF: 'written_off'
} as const;

/**
 * Settlement Constants
 */
export const SETTLEMENT_REASON = {
  OVERPAYMENT: 'overpayment',
  UNDERPAYMENT: 'underpayment',
  ADJUSTMENT: 'adjustment',
  REFUND: 'refund'
} as const;

export const SETTLEMENT_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
  CANCELLED: 'cancelled'
} as const;

/**
 * Plan Billing Cycle Constants
 */
export const PLAN_BILLING_CYCLE = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
} as const;

/**
 * Database Constants
 */
export const DATABASE = {
  CASCADE: 'CASCADE',
  SET_NULL: 'SET NULL',
  RESTRICT: 'RESTRICT',
  DEFAULT_DECIMAL_PRECISION: 12,
  DEFAULT_DECIMAL_SCALE: 2,
  BIGINT_PRECISION: 18,
  BIGINT_SCALE: 2
} as const;

/**
 * Legacy constants for backward compatibility
 */
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SETTLED: 'settled'
} as const;

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;