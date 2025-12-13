/**
 * Shared Utilities Index
 * Central export for all utility functions
 */

// Constants
export * from '../constants';

// Validation utilities
export * from './validation';

// Formatting utilities
export * from './formatting';

// Authentication utilities (excluding problematic imports for now)
export {
  JWTPayload,
  TokenConfig,
  PasswordHashResult,
  PermissionManager,
  SessionManager,
  AuthUtils,
  authUtils,
  permissionManager
} from './auth';

// Database utilities
export * from './database';

// Error handling utilities
export * from './errors';

/**
 * Common utility functions used across the application
 */

/**
 * Sleep/delay function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate random string
 */
export const randomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate random number between min and max
 */
export const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: unknown): boolean => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Retry function with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): Promise<T> => {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      await sleep(delay * Math.pow(backoffFactor, attempt - 1));
      attempt++;
    }
  }
  
  throw new Error('Max retry attempts reached');
};

/**
 * Timeout wrapper
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Array chunk utility
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Array unique utility
 */
export const unique = <T>(array: T[], key?: keyof T): T[] => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

/**
 * Environment variable getter with type conversion
 */
export const getEnvVar = (
  key: string,
  defaultValue?: string,
  type: 'string' | 'number' | 'boolean' = 'string'
): string | number | boolean | undefined => {
  const value = process.env[key] || defaultValue;
  
  if (!value) return undefined;
  
  switch (type) {
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    }
    case 'boolean': {
      return value.toLowerCase() === 'true';
    }
    default:
      return value;
  }
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T = unknown>(
  str: string,
  defaultValue: T | null = null
): T | null => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Safe JSON stringify
 */
export const safeJsonStringify = (
  obj: unknown,
  defaultValue: string = '{}'
): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
};

/**
 * Convert to boolean safely
 */
export const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return ['true', '1', 'yes', 'on', 'y'].includes(lower);
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
};

/**
 * Convert to number safely
 */
export const toNumber = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
};

/**
 * Get nested property safely
 */
export const getNestedProperty = <T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: T = undefined as unknown as T
): T => {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current as T;
};

/**
 * Set nested property safely
 */
export const setNestedProperty = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
};

/**
 * Utility object with all helpers
 */
export const Utils = {
  sleep,
  randomString,
  randomNumber,
  deepClone,
  isEmpty,
  debounce,
  throttle,
  retry,
  withTimeout,
  chunk,
  unique,
  getEnvVar,
  safeJsonParse,
  safeJsonStringify,
  toBoolean,
  toNumber,
  getNestedProperty,
  setNestedProperty
};