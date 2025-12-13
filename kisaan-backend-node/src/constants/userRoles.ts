// Centralized user roles enum
export const USER_ROLES = {
  OWNER: 'owner',
  EMPLOYEE: 'employee',
  FARMER: 'farmer',
  BUYER: 'buyer',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
