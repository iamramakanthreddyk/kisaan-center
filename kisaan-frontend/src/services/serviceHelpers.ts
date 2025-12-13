/**
 * Service layer helper utilities
 * Provides:
 *  - buildQueryString: safely build a query string from an object of params
 *  - normalizeListResponse: coerce variable backend list response shapes into PaginatedResponse<T>
 */

// Generic shape used across getAll style endpoints
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Build a query string from params (skips undefined/null/empty). Includes leading '?' or returns '' */
export function buildQueryString(params?: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v !== undefined && v !== null && v !== '') search.append(key, String(v));
      });
    } else if (value instanceof Date) {
      search.append(key, value.toISOString());
    } else {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface NormalizeOptions {
  /** candidate keys to probe for list array */
  keys?: string[];
  /** fallback limit if backend doesn't send pagination meta */
  limit?: number;
  /** default page */
  page?: number;
}

// Default candidate keys frequently observed in backend responses
const DEFAULT_LIST_KEYS = ['data', 'items', 'results', 'list', 'rows', 'users', 'products', 'transactions', 'payments'];

/**
 * Normalize variable backend list responses into a consistent PaginatedResponse<T>.
 * Supported raw formats:
 *  - { data: T[] }
 *  - { items/results/list/rows: T[] }
 *  - { users/products/transactions/payments: T[] }
 *  - T[] (array directly)
 *  - Any object containing a candidate key with array value
 */
export function normalizeListResponse<T = unknown>(raw: unknown, options?: NormalizeOptions): PaginatedResponse<T> {
  const keys = options?.keys?.length ? options.keys : DEFAULT_LIST_KEYS;
  let array: T[] = [];

  if (Array.isArray(raw)) {
    array = raw as T[];
  } else if (raw && typeof raw === 'object') {
    // Identify first candidate key containing an array
    const foundKey = keys.find(k => Array.isArray((raw as Record<string, unknown>)[k]));
    if (foundKey) {
      array = (raw as Record<string, unknown>)[foundKey] as T[];
    } else if (Array.isArray((raw as { data?: unknown[] }).data)) {
      array = (raw as { data: T[] }).data;
    }
  }

  // If still empty and raw.data could be non-array with nested arrays, attempt shallow scan
  if (array.length === 0 && raw && typeof raw === 'object') {
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (Array.isArray(v)) { array = v as T[]; break; }
    }
  }

  // Pagination meta inference
  const rawObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const meta = (rawObj && typeof rawObj.meta === 'object') ? (rawObj.meta as Record<string, unknown>) : {};
  const page = Number(meta.page) || Number(rawObj.page) || options?.page || 1;
  const limit = Number(meta.limit) || Number(rawObj.limit) || options?.limit || array.length || 10;
  const total = Number(meta.total) || Number(rawObj.total) || (Array.isArray(array) ? array.length : 0);
  const totalPages = Number(meta.totalPages) || Number(rawObj.totalPages) || Math.ceil(total / (limit || 1)) || 1;

  return {
    data: Array.isArray(array) ? array : [],
    total,
    page,
    limit,
    totalPages
  };
}

// Convenience combo for typical list endpoint implementations
export function fetchAndNormalizeList<T>(promise: Promise<unknown>, opts?: NormalizeOptions): Promise<PaginatedResponse<T>> {
  return promise.then(raw => normalizeListResponse<T>(raw, opts));
}

/**
 * Normalize single item responses that may have duplicate or inconsistent data structures.
 * Handles cases like:
 * - { success: true, data: { user: {...} }, user: {...} } (duplicate user data)
 * - { success: true, data: {...} }
 * - { success: true, user: {...} }
 */
export function normalizeSingleItemResponse<T = unknown>(raw: unknown, itemKey?: string): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const rawObj = raw as Record<string, unknown>;

  // If there's a data property, prefer it first
  if ('data' in rawObj && rawObj.data) {
    const data = rawObj.data as Record<string, unknown>;
    // Check if data has the specific item key (e.g., data.user)
    if (itemKey && data[itemKey]) {
      return data[itemKey] as T;
    }
    // Otherwise return data directly if it looks like the item
    if (typeof data === 'object' && !Array.isArray(data)) {
      return data as T;
    }
  }

  // Fallback to the direct item key (e.g., raw.user)
  if (itemKey && rawObj[itemKey]) {
    return rawObj[itemKey] as T;
  }

  // If no specific key provided, try common keys
  const commonKeys = ['user', 'shop', 'product', 'category', 'transaction', 'payment'];
  for (const key of commonKeys) {
    if (rawObj[key] && typeof rawObj[key] === 'object') {
      return rawObj[key] as T;
    }
  }

  return null;
}
