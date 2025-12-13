// Global error handling middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logging/logger';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // Prefer per-request logger if present
  if ('log' in req && typeof req.log?.error === 'function') {
    req.log.error({ err }, 'unhandled error');
  }
  logger.error({ err }, 'unhandled error');

  if (res.headersSent) {
    return next(err);
  }

  // Use type guard for error shape
  let status = 500;
  let message = 'Internal Server Error';
  let details: unknown = undefined;
  if (typeof err === 'object' && err !== null) {
    if ('status' in err && typeof (err as Record<string, unknown>).status === 'number') {
      status = (err as Record<string, unknown>).status as number;
    }
    if ('message' in err && typeof (err as Record<string, unknown>).message === 'string') {
      message = (err as Record<string, unknown>).message as string;
    }
    if ('details' in err) {
      details = (err as Record<string, unknown>).details;
    }
  }
  res.status(status).json({
    success: false,
    message,
    error: message,
    details,
  });
}
