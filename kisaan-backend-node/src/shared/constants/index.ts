/**
 * Application Constants
 * Single source of truth for all application constants
 */

/**
 * User Roles
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  FARMER: 'farmer',
  BUYER: 'buyer',
  EMPLOYEE: 'employee'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * User Status
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

/**
 * Transaction Status
 */
export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED'
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

/**
 * Payment Status
 */
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

export type PaymentStatusConst = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

/**
 * Balance Snapshot types
 */
export const BALANCE_TYPE = {
  FARMER: 'farmer',
  BUYER: 'buyer'
} as const;

export type BalanceType = typeof BALANCE_TYPE[keyof typeof BALANCE_TYPE];

/**
 * Product Status
 */
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

/**
 * Shop Status
 */
export const SHOP_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type ShopStatus = typeof SHOP_STATUS[keyof typeof SHOP_STATUS];

/**
 * Plan Status
 */
export const PLAN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type PlanStatus = typeof PLAN_STATUS[keyof typeof PLAN_STATUS];

/**
 * Permission Constants
 */
export const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  
  // Shop permissions
  SHOP_READ: 'shop:read',
  SHOP_WRITE: 'shop:write',
  SHOP_DELETE: 'shop:delete',
  
  // Product permissions
  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',
  PRODUCT_DELETE: 'product:delete',
  
  // Transaction permissions
  TRANSACTION_READ: 'transaction:read',
  TRANSACTION_WRITE: 'transaction:write',
  TRANSACTION_DELETE: 'transaction:delete',
  
  // Report permissions
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
  
  // Admin permissions
  ADMIN_ALL: 'admin:*',
  SYSTEM_ADMIN: 'system:admin'
} as const;

/**
 * Role Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [USER_ROLES.SUPERADMIN]: [PERMISSIONS.ADMIN_ALL],
  [USER_ROLES.OWNER]: [
    PERMISSIONS.SHOP_READ,
    PERMISSIONS.SHOP_WRITE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_WRITE,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_WRITE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT
  ],
  [USER_ROLES.FARMER]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.REPORT_READ
  ],
  [USER_ROLES.BUYER]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.REPORT_READ
  ]
  ,
  [USER_ROLES.EMPLOYEE]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.TRANSACTION_READ
  ]
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  DEFAULT_SORT_ORDER: 'ASC' as const,
  DEFAULT_SORT_FIELD: 'id'
};

/**
 * Validation Constants
 */
export const VALIDATION = {
  // Password rules
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  
  // Username rules
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
  
  // Name rules
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  
  // Phone rules
  PHONE_PATTERN: /^\+?[\d\s\-()]+$/,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  
  // Email rules
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MAX_LENGTH: 255,
  
  // Numeric rules
  DECIMAL_PRECISION: 2,
  MAX_DECIMAL_PLACES: 10,
  MIN_POSITIVE_NUMBER: 0.01,
  MAX_CURRENCY_VALUE: 999999999.99
};

/**
 * Database Constants
 */
export const DATABASE = {
  DEFAULT_DECIMAL_PRECISION: 10,
  DEFAULT_DECIMAL_SCALE: 2,
  DEFAULT_STRING_LENGTH: 255,
  DEFAULT_TEXT_LENGTH: 65535,
  
  // Foreign key actions
  CASCADE: 'CASCADE',
  SET_NULL: 'SET NULL',
  RESTRICT: 'RESTRICT'
};

/**
 * Cache Constants
 */
export const CACHE = {
  DEFAULT_TTL: 3600, // 1 hour in seconds
  SHORT_TTL: 300,    // 5 minutes
  LONG_TTL: 86400,   // 24 hours
  
  KEYS: {
    USER_SESSION: 'session:user:',
    SHOP_CONFIG: 'shop:config:',
    PRODUCT_CACHE: 'product:',
    ANALYTICS_CACHE: 'analytics:'
  }
};

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Authorization errors
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Business rule errors
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INVALID_OPERATION: 'INVALID_OPERATION',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Environment Constants
 */
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  TESTING: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;

/**
 * File Upload Constants
 */
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  UPLOAD_PATH: 'uploads/',
  IMAGE_PATH: 'uploads/images/',
  DOCUMENT_PATH: 'uploads/documents/'
};

/**
 * Date/Time Constants
 */
export const DATE_TIME = {
  // Date formats
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
  
  // Timezone
  DEFAULT_TIMEZONE: 'UTC',
  
  // Periods
  DAY_IN_SECONDS: 86400,
  HOUR_IN_SECONDS: 3600,
  MINUTE_IN_SECONDS: 60
};

/**
 * Commission Constants
 */
export const COMMISSION = {
  DEFAULT_RATE: 0.05, // 5%
  MIN_RATE: 0.0,      // 0%
  MAX_RATE: 0.5,      // 50%
  PRECISION: 4        // 4 decimal places
};

/**
 * Transaction Constants
 */
export const TRANSACTION = {
  MIN_QUANTITY: 0.01,
  MAX_QUANTITY: 999999.99,
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  DECIMAL_PLACES: 2
};

/**
 * System Limits
 */
export const LIMITS = {
  MAX_USERS_PER_SHOP: 1000,
  MAX_PRODUCTS_PER_CATEGORY: 10000,
  MAX_TRANSACTIONS_PER_DAY: 50000,
  MAX_BULK_OPERATION_SIZE: 1000
};

/**
 * Audit Constants
 */
export const AUDIT = {
  ACTIONS: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    VIEW: 'VIEW'
  },
  
  ENTITIES: {
    USER: 'User',
    SHOP: 'Shop',
    PRODUCT: 'Product',
    TRANSACTION: 'Transaction',
    CATEGORY: 'Category',
    PLAN: 'Plan'
  }
};