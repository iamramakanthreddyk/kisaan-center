// Centralized constants & enums
export const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  BUYER: 'buyer',
  FARMER: 'farmer'
} as const;

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 200
} as const;

export const BILLING_CYCLES = ['monthly','quarterly','yearly'] as const;
