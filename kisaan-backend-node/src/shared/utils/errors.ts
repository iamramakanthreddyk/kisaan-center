/**
 * Error Handling Utilities
 * Comprehensive error handling, logging, and response formatting
 */

import { ERROR_CODES, HTTP_STATUS } from '../constants';

/**
 * Custom Error Classes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: string = ERROR_CODES.INTERNAL_ERROR,
    isOperational: boolean = true,
  context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      true,
      context
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(
      message,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.INVALID_CREDENTIALS,
      true,
      context
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(
      message,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.ACCESS_DENIED,
      true,
      context
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(
      `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.INVALID_OPERATION,
      true,
      context
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.DUPLICATE_ENTRY,
      true,
      context
    );
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BUSINESS_RULE_VIOLATION,
      true,
      context
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    // Allow optional exposure of original diagnostic if explicitly provided via context flags
    let exposeOriginal = false;
    let originalValue = '';
    if (context && typeof context === 'object' && 'diagnostic' in context) {
      const diagnostic = (context as { diagnostic?: { original?: string; allowExposeOriginal?: boolean } }).diagnostic;
      exposeOriginal = !!diagnostic?.original && !!diagnostic?.allowExposeOriginal;
      originalValue = diagnostic?.original ?? '';
    }
    const publicMessage = exposeOriginal ? `Database operation failed: ${originalValue}` : 'Database operation failed';
    super(
      publicMessage,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      true,
      { originalMessage: message, ...context }
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(
      `External service error: ${service}`,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      true,
      { service, originalMessage: message, ...context }
    );
  }
}

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  details?: unknown;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Validation Error Details
 */
export interface ValidationErrorDetails {
  field: string;
  value: unknown;
  message: string;
  code: string;
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private isDevelopment: boolean;
  private logger: { warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };

  constructor(isDevelopment: boolean = false, logger: { warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void } = console) {
    this.isDevelopment = isDevelopment;
    this.logger = logger;
  }

  /**
   * Handle and format error for API response
   */
  handleError(error: Error, requestId?: string): ErrorResponse {
  let _statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let errorCode = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;

      this.logError(error, requestId);

    if (error instanceof AppError) {
      _statusCode = error.statusCode;
      errorCode = error.errorCode;
      message = error.message;
      details = error.context;
    } else if (error.name === 'SequelizeValidationError') {
  _statusCode = HTTP_STATUS.BAD_REQUEST;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
      message = 'Validation failed';
      if (typeof error === 'object' && error !== null && 'errors' in error) {
        details = this.formatSequelizeValidationError(error as { errors: Array<{ path: string; value: unknown; message: string; validatorKey?: string }> });
      }
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      errorCode = ERROR_CODES.DUPLICATE_ENTRY;
      message = 'Duplicate entry';
      if (typeof error === 'object' && error !== null && 'fields' in error && 'value' in error) {
        details = this.formatSequelizeUniqueError(error as { fields: Record<string, unknown>; value: unknown });
      }
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      _statusCode = HTTP_STATUS.BAD_REQUEST;
      errorCode = ERROR_CODES.BUSINESS_RULE_VIOLATION;
      message = 'Foreign key constraint violation';
    } else if (error.name === 'JsonWebTokenError') {
  // statusCode = HTTP_STATUS.UNAUTHORIZED;
      errorCode = ERROR_CODES.TOKEN_INVALID;
      message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      _statusCode = HTTP_STATUS.UNAUTHORIZED;
      errorCode = ERROR_CODES.TOKEN_EXPIRED;
      message = 'Token expired';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    // Include stack trace in development
    if (this.isDevelopment) {
      errorResponse.error.stack = error.stack;
    }

    return errorResponse;
  }

  /**
   * Log error with context
   */
  private logError(error: Error, requestId?: string): void {
    const logContext: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      requestId,
      timestamp: new Date().toISOString()
    };

    if (error instanceof AppError) {
      logContext.statusCode = error.statusCode;
      logContext.errorCode = error.errorCode;
      logContext.context = error.context;
    }

    if (error instanceof AppError && error.statusCode < 500) {
      this.logger.warn('Client Error:', logContext);
    } else {
      this.logger.error('Server Error:', logContext);
    }
  }

  /**
   * Format Sequelize validation errors
   */
  private formatSequelizeValidationError(error: { errors: Array<{ path: string; value: unknown; message: string; validatorKey?: string }> }): ValidationErrorDetails[] {
    return error.errors.map((err) => ({
      field: err.path,
      value: err.value,
      message: err.message,
      code: err.validatorKey || 'validation_failed'
    }));
  }

  /**
   * Format Sequelize unique constraint errors
   */
  private formatSequelizeUniqueError(error: { fields: Record<string, unknown>; value: unknown }): { fields: Record<string, unknown>; value: unknown; message: string } {
    return {
      fields: error.fields,
      value: error.value,
      message: `Duplicate value for ${Object.keys(error.fields).join(', ')}`
    };
  }

  /**
   * Create validation error
   */
  static createValidationError(
    errors: ValidationErrorDetails[]
  ): ValidationError {
    const message = `Validation failed: ${errors.map(e => e.message).join(', ')}`;
    return new ValidationError(message, { errors });
  }

  /**
   * Create not found error
   */
  static createNotFoundError(
    resource: string,
    identifier?: string | number
  ): NotFoundError {
    const resourceName = identifier 
      ? `${resource} with ID ${identifier}` 
      : resource;
    return new NotFoundError(resourceName);
  }

  /**
   * Create authorization error
   */
  static createAuthorizationError(
    action: string,
    resource: string
  ): AuthorizationError {
    return new AuthorizationError(
      `Not authorized to ${action} ${resource}`
    );
  }
}

/**
 * Error Catcher Decorator
 */
export function CatchErrors(
  errorHandler?: (error: Error) => void
) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error);
        }
        throw error;
      }
    };
  };
}

/**
 * Async Error Wrapper
 */
export function asyncHandler(
  fn: (...args: unknown[]) => Promise<unknown>
) {
  return (...args: unknown[]) => {
    const next = args[args.length - 1];
    return Promise.resolve(fn(...args)).catch((err) => {
      if (typeof next === 'function') {
        next(err);
      }
    });
  };
}

/**
 * Error Utils
 */
export class ErrorUtils {
  /**
   * Check if error is operational
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Check if error is client error (4xx)
   */
  static isClientError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.statusCode >= 400 && error.statusCode < 500;
    }
    return false;
  }

  /**
   * Check if error is server error (5xx)
   */
  static isServerError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.statusCode >= 500;
    }
    return true; // Assume unknown errors are server errors
  }

  /**
   * Extract error message safely
   */
  static extractMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Create error summary for logging
   */
  static createErrorSummary(error: Error): {
    name: string;
    message: string;
    statusCode?: number;
    errorCode?: string;
    isOperational?: boolean;
  } {
    const summary = {
      name: error.name,
      message: error.message
    };

    if (error instanceof AppError) {
      return {
        ...summary,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        isOperational: error.isOperational
      };
    }

    return summary;
  }

  /**
   * Sanitize error for client response
   */
  static sanitizeErrorForClient(error: Error, includeStack: boolean = false): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {
      name: error.name,
      message: error.message
    };

    if (error instanceof AppError) {
      sanitized.code = error.errorCode;
      sanitized.context = error.context;
    }

    if (includeStack) {
      sanitized.stack = error.stack;
    }

    return sanitized;
  }
}

/**
 * Error Factory
 */
export class ErrorFactory {
  /**
   * Create validation error from field errors
   */
  static validation(fieldErrors: Array<{ field: string; message: string }>): ValidationError {
    const message = fieldErrors.map(e => `${e.field}: ${e.message}`).join(', ');
    return new ValidationError(message, { fieldErrors });
  }

  /**
   * Create not found error
   */
  static notFound(resource: string, id?: string | number): NotFoundError {
    return new NotFoundError(resource, { id });
  }

  /**
   * Create unauthorized error
   */
  static unauthorized(message?: string): AuthenticationError {
    return new AuthenticationError(message);
  }

  /**
   * Create forbidden error
   */
  static forbidden(action?: string, resource?: string): AuthorizationError {
    const message = action && resource 
      ? `Not authorized to ${action} ${resource}`
      : 'Access forbidden';
    return new AuthorizationError(message);
  }

  /**
   * Create conflict error
   */
  static conflict(message: string, context?: Record<string, unknown>): ConflictError {
    return new ConflictError(message, context);
  }

  /**
   * Create database error
   */
  static database(originalError: Error): DatabaseError {
    return new DatabaseError(originalError.message, {
      originalError: originalError.name,
      stack: originalError.stack
    });
  }
}

/**
 * Export configured error handler
 */
export const errorHandler = new ErrorHandler(
  process.env.NODE_ENV === 'development',
  console
);