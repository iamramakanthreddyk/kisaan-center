import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logging/logger';

import { DatabaseError, AppError } from '../shared/utils/errors';




export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const statusMap: Record<string, number> = {
    ValidationError: 400,
    AuthorizationError: 403,
    NotFoundError: 404,
    BusinessRuleError: 422
  };
  let status = 500;
  let baseMessage = 'Internal Server Error';
  let errorName = 'InternalError';
  let legacy: unknown = undefined;
  let context: unknown = undefined;
  let stack: unknown = undefined;
  if (typeof err === 'object' && err !== null) {
    if ('name' in err && typeof err.name === 'string' && err.name in statusMap) {
      status = statusMap[err.name];
    }
    if (err instanceof DatabaseError) status = 500;
    if (err instanceof AppError) status = err.statusCode;
    if ('message' in err && typeof err.message === 'string') baseMessage = err.message;
    if ('name' in err && typeof err.name === 'string') errorName = err.name;
    if ('legacyPayload' in err) legacy = (err as { legacyPayload?: unknown }).legacyPayload;
    if ('context' in err) context = (err as { context?: unknown }).context;
    if ('stack' in err) stack = (err as { stack?: unknown }).stack;
  }

  // Log
  if (status >= 500) {
    const reqId = typeof req.id === 'string' ? req.id : undefined;
    logger.error({ err, reqId }, 'Unhandled server error');
  } else {
    if ('log' in req && typeof req.log?.warn === 'function') {
      req.log.warn({ err }, 'Application error');
    }
  }

  // Build details object (include legacy + stack in dev)
  const details: Record<string, unknown> = {};
  if (legacy) details.legacy = legacy;
  if (context) details.context = context;
  if (process.env.NODE_ENV === 'development' && stack) details.stack = stack;

  return res.status(status).json({
    success: false,
    error: errorName,
    message: baseMessage,
    reqId: typeof req.id === 'string' ? req.id : undefined,
    details: Object.keys(details).length ? details : undefined,
  });
}
