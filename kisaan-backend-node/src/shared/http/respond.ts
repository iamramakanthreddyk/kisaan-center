import { Response } from 'express';
import { ErrorCode } from '../errors/errorCodes';

interface SuccessOpts {
  statusCode?: number;
  aliasKey?: string; // legacy key for backward compatibility (e.g. shop)
  message?: string;
  meta?: Record<string, unknown>;
}

// success: standardized success envelope.
// Backward compatibility: if aliasKey provided, also expose legacy top-level key (temporary).
// TODO(Removal): Remove top-level legacy alias exposure once frontend fully migrated to use payload.data.<alias> only.
export function success<T = unknown>(res: Response, data: T, opts?: SuccessOpts) {
  const { message, aliasKey, meta, statusCode } = opts || {};
  const payload: Record<string, unknown> = { success: true };
  if (message) payload.message = message;
  if (meta) payload.meta = meta;
  if (aliasKey) {
    payload.data = { [aliasKey]: data };
    // Legacy top-level (to be removed after frontend migration)
    (payload as Record<string, unknown>)[aliasKey] = data;
  } else {
    payload.data = data;
  }
  return statusCode ? res.status(statusCode).json(payload) : res.json(payload);
}

// Standardized delete responder for single-id deletes
export function standardDelete(res: Response, id: number | string, entity?: string) {
  const base = entity ? `${capitalize(entity)} deleted successfully` : 'Deleted successfully';
  return success(res, { id }, { message: base });
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function created<T = unknown>(res: Response, data: T, opts: Omit<SuccessOpts,'statusCode'> = {}) {
  return success(res, data, { ...opts, statusCode: 201 });
}

// Generic failure responder (backward compatible). "error" may be any string.
export function failure(res: Response, statusCode: number, error: string | ErrorCode, details?: unknown, message?: string) {
  return res.status(statusCode).json({ success: false, error, message: message || error, details });
}

// Typed failure responder enforcing centralized ErrorCode usage.
// Prefer this for new / refactored code; legacy code may still call failure().
export function failureCode(res: Response, statusCode: number, code: ErrorCode, details?: unknown, message?: string) {
  return failure(res, statusCode, code, details, message);
}
