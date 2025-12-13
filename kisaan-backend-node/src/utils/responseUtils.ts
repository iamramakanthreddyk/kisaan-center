// Shared utility functions to eliminate duplication across controllers
import { Response } from 'express';

/**
 * Standardized API response formats
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

/**
 * Send standardized success response
 */
export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  } as ApiResponse<T>);
};

/**
 * Send standardized error response
 */
export const sendError = (
  res: Response, 
  error: string, 
  statusCode = 500, 
  details?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    error,
    details
  } as ApiResponse);
};

/**
 * Send validation error response
 */
export const sendValidationError = (res: Response, details: unknown): Response => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details
  } as ApiResponse);
};

/**
 * Send not found error response
 */
export const sendNotFound = (res: Response, resource: string): Response => {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  } as ApiResponse);
};

/**
 * Send bad request error response
 */
export const sendBadRequest = (res: Response, message: string, details?: unknown): Response => {
  return res.status(400).json({
    success: false,
    error: message,
    details
  } as ApiResponse);
};

/**
 * Async error handler wrapper for controllers
 */
import type { Request, NextFunction } from 'express';
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Parse and validate integer ID from request params
 */
export const parseId = (value: string): number | null => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

/**
 * Validate required fields in request body
 */
export const validateRequiredFields = (body: Record<string, unknown>, requiredFields: string[]): string[] => {
  const missing: string[] = [];
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0) {
      missing.push(field);
    }
  }
  return missing;
};

/**
 * Common pagination helper
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const parsePagination = (query: Record<string, unknown>): PaginationParams => {
  // Accepts query params as Record<string, unknown>
  const getString = (val: unknown) => (typeof val === 'string' ? val : '');
  const page = Math.max(1, parseInt(getString(query.page)) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(getString(query.limit)) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Format pagination response
 */
export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) => {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    }
  };
};