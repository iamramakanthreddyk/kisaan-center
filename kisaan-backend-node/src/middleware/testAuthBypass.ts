import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Test-only authentication bypass. If NODE_ENV==='test' and no Authorization header,
 * attaches a mock superadmin user so protected routes pass.
 */
export function testAuthBypass(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test' && !req.headers.authorization) {
    req.user = { id: 0, username: 'test_superadmin', role: 'superadmin', shop_id: null };
  }
  next();
}