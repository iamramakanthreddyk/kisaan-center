/**
 * Response Helper Utilities
 * Standardized API response formatting and HTTP helpers
 */

import { HTTP_STATUS } from '../constants';

/**
 * Success Response Interface
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Paginated Response Interface
 */
export interface PaginatedResponse<T = unknown> extends SuccessResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Response Builder Class
 */
export class ResponseBuilder {
  /**
   * Create success response
   */
  static success<T>(
    data: T,
    message?: string,
  meta?: Record<string, unknown>
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Create paginated success response
   */
  static paginated<T>(
    data: T,
    pagination: PaginatedResponse<T>['pagination'],
    message?: string,
  meta?: Record<string, unknown>
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Create created response (201)
   */
  static created<T>(
    data: T,
    message?: string,
  meta?: Record<string, unknown>
  ): SuccessResponse<T> {
    return this.success(data, message || 'Resource created successfully', meta);
  }

  /**
   * Create updated response (200)
   */
  static updated<T>(
    data: T,
    message?: string,
  meta?: Record<string, unknown>
  ): SuccessResponse<T> {
    return this.success(data, message || 'Resource updated successfully', meta);
  }

  /**
   * Create deleted response (204 content)
   */
  static deleted(
    message?: string,
  meta?: Record<string, unknown>
  ): SuccessResponse<null> {
    return this.success(null, message || 'Resource deleted successfully', meta);
  }

  /**
   * Create no content response
   */
  static noContent(): SuccessResponse<null> {
    return this.success(null, 'No content');
  }
}

/**
 * HTTP Response Helper
 */
export class HttpResponseHelper {
  /**
   * Send success response
   */
  static sendSuccess<T>(
  res: { status: (code: number) => { json: (body: unknown) => void; send?: () => void } },
    data: T,
    statusCode: number = HTTP_STATUS.OK,
    message?: string,
  meta?: Record<string, unknown>
  ): void {
    const response = ResponseBuilder.success(data, message, meta);
    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static sendPaginated<T>(
  res: { status: (code: number) => { json: (body: unknown) => void; send?: () => void } },
    data: T,
    pagination: PaginatedResponse<T>['pagination'],
    statusCode: number = HTTP_STATUS.OK,
    message?: string,
  meta?: Record<string, unknown>
  ): void {
    const response = ResponseBuilder.paginated(data, pagination, message, meta);
    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static sendCreated<T>(
  res: { status: (code: number) => { json: (body: unknown) => void; send?: () => void } },
    data: T,
    message?: string,
  meta?: Record<string, unknown>
  ): void {
    const response = ResponseBuilder.created(data, message, meta);
    res.status(HTTP_STATUS.CREATED).json(response);
  }

  /**
   * Send updated response
   */
  static sendUpdated<T>(
  res: { status: (code: number) => { json: (body: unknown) => void; send?: () => void } },
    data: T,
    message?: string,
  meta?: Record<string, unknown>
  ): void {
    const response = ResponseBuilder.updated(data, message, meta);
    res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send deleted response
   */
  static sendDeleted(
  res: { status: (code: number) => { json: (body: unknown) => void; send?: () => void } },
    message?: string,
  meta?: Record<string, unknown>
  ): void {
    const response = ResponseBuilder.deleted(message, meta);
    res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send no content response
   */
  static sendNoContent(res: { status: (code: number) => { send: () => void } }): void {
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send error response
   */
  static sendError(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  error: { code?: string; message?: string; details?: unknown },
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    requestId?: string
  ): void {
    const errorResponse = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
}

/**
 * Export response helpers
 */
export const Response = {
  Builder: ResponseBuilder,
  Http: HttpResponseHelper
};