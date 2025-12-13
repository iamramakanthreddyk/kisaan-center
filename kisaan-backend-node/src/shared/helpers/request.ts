/**
 * Request Helper Utilities
 * Extract and validate data from HTTP requests
 */

/**
 * Request Validation Options
 */
export interface RequestValidationOptions {
  required?: string[];
  optional?: string[];
  types?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>;
  sanitize?: boolean;
}

/**
 * Extracted Request Data
 */
export interface ExtractedData {
  [key: string]: unknown;
}

/**
 * Request Data Extractor
 */
export class RequestExtractor {
  /**
   * Extract and validate request body
   */

  static extractBody(
    req: Record<string, unknown>,
    options?: RequestValidationOptions
  ): { data: ExtractedData; errors: string[] } {
    const body = (typeof req.body === 'object' && req.body !== null) ? req.body as Record<string, unknown> : {};
    return this.extractAndValidate(body, options);
  }

  /**
   * Extract and validate query parameters
   */

  static extractQuery(
    req: Record<string, unknown>,
    options?: RequestValidationOptions
  ): { data: ExtractedData; errors: string[] } {
    const query = (typeof req.query === 'object' && req.query !== null) ? req.query as Record<string, unknown> : {};
    return this.extractAndValidate(query, options);
  }

  /**
   * Extract and validate route parameters
   */

  static extractParams(
    req: Record<string, unknown>,
    options?: RequestValidationOptions
  ): { data: ExtractedData; errors: string[] } {
    const params = (typeof req.params === 'object' && req.params !== null) ? req.params as Record<string, unknown> : {};
    return this.extractAndValidate(params, options);
  }

  /**
   * Extract pagination parameters
   */
  static extractPagination(req: { query: Record<string, unknown> }): {
    page: number;
    limit: number;
    offset: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let page = 1;
    let limit = 10;

    // Extract page

    if (req.query.page !== undefined) {
      const pageStr = typeof req.query.page === 'string' ? req.query.page : null;
      const pageNum = pageStr !== null ? parseInt(pageStr, 10) : NaN;
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      } else {
        page = pageNum;
      }
    }

    // Extract limit

    if (req.query.limit !== undefined) {
      const limitStr = typeof req.query.limit === 'string' ? req.query.limit : null;
      const limitNum = limitStr !== null ? parseInt(limitStr, 10) : NaN;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('Limit must be between 1 and 100');
      } else {
        limit = limitNum;
      }
    }

    const offset = (page - 1) * limit;

    return { page, limit, offset, errors };
  }

  /**
   * Extract sort parameters
   */
  static extractSort(req: { query: Record<string, unknown> }): {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
    errors: string[];
  } {
    const errors: string[] = [];
    let sortBy = 'id';
    let sortOrder: 'ASC' | 'DESC' = 'ASC';

    // Extract sort field
    if (req.query.sortBy) {
      if (typeof req.query.sortBy === 'string' && req.query.sortBy.trim()) {
        sortBy = req.query.sortBy.trim();
      } else {
        errors.push('Sort field must be a non-empty string');
      }
    }

    // Extract sort order
    if (req.query.sortOrder) {
      const order = req.query.sortOrder.toString().toUpperCase();
      if (order === 'ASC' || order === 'DESC') {
        sortOrder = order;
      } else {
        errors.push('Sort order must be ASC or DESC');
      }
    }

    return { sortBy, sortOrder, errors };
  }

  /**
   * Extract filter parameters
   */
  static extractFilters(req: { query: Record<string, unknown> }, allowedFields: string[] = []): {
    filters: Record<string, unknown>;
    errors: string[];
  } {
    const errors: string[] = [];
  const filters: Record<string, unknown> = {};

    if (!req.query.filters) {
      return { filters, errors };
    }

    try {
      const parsedFilters = typeof req.query.filters === 'string' 
        ? JSON.parse(req.query.filters)
        : req.query.filters;

      if (typeof parsedFilters === 'object' && parsedFilters !== null) {
        for (const [field, value] of Object.entries(parsedFilters)) {
          if (allowedFields.length > 0 && !allowedFields.includes(field)) {
            errors.push(`Filter field '${field}' is not allowed`);
            continue;
          }

          filters[field] = value;
        }
      } else {
        errors.push('Filters must be a valid JSON object');
      }
    } catch (error) {
      errors.push('Invalid filters format - must be valid JSON');
    }

    return { filters, errors };
  }

  /**
   * Extract user info from request (assumes auth middleware has run)
   */
  static extractUser(req: { user?: Record<string, unknown> }): {
    userId?: number;
    username?: string;
    role?: string;
    shopId?: number;
    permissions?: string[];
  } {
    const user = req.user && typeof req.user === 'object' ? req.user as Record<string, unknown> : {};
    return {
      userId: typeof user.userId === 'number' ? user.userId : undefined,
      username: typeof user.username === 'string' ? user.username : undefined,
      role: typeof user.role === 'string' ? user.role : undefined,
      shopId: typeof user.shopId === 'number' ? user.shopId : undefined,
      permissions: Array.isArray(user.permissions) && user.permissions.every(p => typeof p === 'string') ? user.permissions as string[] : []
    };
  }

  /**
   * Extract request metadata
   */
  static extractMetadata(req: { ip?: string; connection?: { remoteAddress?: string }; get?: (header: string) => string | undefined; method: string; originalUrl?: string; url: string; requestId?: string }): {
    ip: string;
    userAgent: string;
    method: string;
    url: string;
    timestamp: Date;
    requestId?: string;
  } {
    return {
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: typeof req.get === 'function' ? req.get('User-Agent') || 'unknown' : 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      timestamp: new Date(),
      requestId: req.requestId
    };
  }

  /**
   * Core extraction and validation logic
   */
  private static extractAndValidate(
    data: Record<string, unknown>,
    options?: RequestValidationOptions
  ): { data: ExtractedData; errors: string[] } {
    const errors: string[] = [];
  const result: ExtractedData = {};

    if (!options) {
      return { data, errors };
    }

    const { required = [], optional = [], types = {}, sanitize = true } = options;


    // Check required fields
    for (const field of required) {
      if (!(field in data) || data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${field} is required`);
        continue;
      }
      result[field] = data[field];
    }

    // Add optional fields
    for (const field of optional) {
      if (field in data && data[field] !== undefined && data[field] !== null) {
        result[field] = data[field];
      }
    }

    // Type validation and conversion
    for (const [field, expectedType] of Object.entries(types)) {
      if (!(field in result)) continue;

      const value = result[field];
      const converted = this.convertType(value, expectedType);

      if (converted.success) {
        result[field] = converted.value;
      } else {
        errors.push(`${field} must be of type ${expectedType}`);
      }
    }

    // Sanitization
    if (sanitize) {
      for (const [field, value] of Object.entries(result)) {
        if (typeof value === 'string') {
          result[field] = value.trim();
        }
      }
    }

    return { data: result, errors };
  }

  /**
   * Type conversion helper
   */
  private static convertType(value: unknown, expectedType: string): {
    success: boolean;
    value: unknown;
  } {
    try {
      switch (expectedType) {
        case 'string':
          return { success: true, value: String(value) };
        
        case 'number': {
          const num = Number(value);
          return { 
            success: !isNaN(num), 
            value: num 
          };
        }
        
        case 'boolean':
          if (typeof value === 'boolean') {
            return { success: true, value };
          }
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (['true', '1', 'yes'].includes(lower)) {
              return { success: true, value: true };
            }
            if (['false', '0', 'no'].includes(lower)) {
              return { success: true, value: false };
            }
          }
          return { success: false, value };
        
        case 'array':
          if (Array.isArray(value)) {
            return { success: true, value };
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return { 
                success: Array.isArray(parsed), 
                value: parsed 
              };
            } catch {
              return { success: false, value };
            }
          }
          return { success: false, value };
        
        case 'object':
          if (typeof value === 'object' && value !== null) {
            return { success: true, value };
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return { 
                success: typeof parsed === 'object' && parsed !== null, 
                value: parsed 
              };
            } catch {
              return { success: false, value };
            }
          }
          return { success: false, value };
        
        default:
          return { success: true, value };
      }
    } catch {
      return { success: false, value };
    }
  }
}

/**
 * Request Validator Helper
 */
export class RequestValidator {
  /**
   * Validate ID parameter
   */
  static validateId(id: unknown): { isValid: boolean; id?: number; error?: string } {
    if (!id) {
      return { isValid: false, error: 'ID is required' };
    }

    const numericId = Number(id);
    
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      return { isValid: false, error: 'ID must be a positive integer' };
    }

    return { isValid: true, id: numericId };
  }

  /**
   * Validate required fields
   */
  static validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!(field in data) || data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${field} is required`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    startDate?: string,
    endDate?: string
  ): { isValid: boolean; dates?: { start?: Date; end?: Date }; error?: string } {
    const dates: { start?: Date; end?: Date } = {};

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return { isValid: false, error: 'Invalid start date format' };
      }
      dates.start = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return { isValid: false, error: 'Invalid end date format' };
      }
      dates.end = end;
    }

    if (dates.start && dates.end && dates.start > dates.end) {
      return { isValid: false, error: 'Start date must be before end date' };
    }

    return { isValid: true, dates };
  }
}

/**
 * Export request helpers
 */
export const Request = {
  Extractor: RequestExtractor,
  Validator: RequestValidator
};