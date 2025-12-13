import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';

export function requireSuperadmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Access denied',
      message: `Required role: superadmin. Your role: ${req.user?.role || 'unknown'}`
    });
  }
  next();
}
