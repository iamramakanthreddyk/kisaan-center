
import { Request, Response, NextFunction } from 'express';
import { createRequestLogger } from '../shared/logging/logger';
import { v4 as uuid } from 'uuid';

// Module augmentation for Express Request
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    log?: ReturnType<typeof createRequestLogger>;
  }
}

export function requestContext(req: Request, _res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] as string || uuid();
  req.id = id;
  req.log = createRequestLogger(id);
  req.log.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
}
