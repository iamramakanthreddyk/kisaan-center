// Authentication and authorization middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { UserRole } from '../schemas/user';
import { failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { AuthService } from '../services/authService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Use global Express Request type with user property
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: UserRole;
    shop_id?: number | null;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      failureCode(res, 401, ErrorCodes.AUTH_TOKEN_REQUIRED, undefined, 'Access token required');
      return;
    }

    // Use AuthService to verify token (includes session validation)
    const authService = new AuthService();
    let decoded;
    try {
      decoded = await authService.verifyToken(token) as {
        id: number;
        username: string;
        role: UserRole;
        shop_id?: number | null;
        jti?: string;
      };
    } catch (authError) {
      console.error('[AUTH ERROR] Token verification failed:', authError instanceof Error ? authError.message : String(authError));
      req.user = undefined;
      failureCode(res, 403, ErrorCodes.INVALID_TOKEN, undefined, 'Invalid token');
      return;
    }

    // Fetch fresh user data to ensure user still exists and is active
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    // User existence check only (status field removed in simplified model)
    if (!user) {
      console.log(`[AUTH] User not found in DB: userId=${decoded.id}`);
      req.user = undefined;
      failureCode(res, 401, ErrorCodes.INVALID_USER, undefined, 'Invalid user');
      return;
    }

    // Update last_activity for authenticated requests
    await User.update(
      { last_activity: new Date() },
      { where: { id: user.id }, silent: true }
    );

    console.log(`[AUTH] Token verified and user found: userId=${user.id}, username=${user.username}`);
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      shop_id: user.shop_id,
    };

    next();
  } catch (error) {
    console.error('[AUTH ERROR] Unexpected error in authenticateToken:', error instanceof Error ? error.message : String(error));
    req.user = undefined;
    failureCode(res, 403, ErrorCodes.INVALID_TOKEN, undefined, 'Invalid token');
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param allowedRoles - Array of roles that can access the resource
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      failureCode(res, 401, ErrorCodes.AUTH_REQUIRED, undefined, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      failureCode(res, 403, ErrorCodes.ACCESS_DENIED, { required: allowedRoles, actual: req.user.role }, `Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`);
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user can access resource within their shop
 * @param getShopId - Function to extract shop_id from request params
 */
export const requireShopAccess = (getShopId?: (req: AuthenticatedRequest) => number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      failureCode(res, 401, ErrorCodes.AUTH_REQUIRED, undefined, 'Authentication required');
      return;
    }

    // Superadmin can access everything
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { USER_ROLES } = require('../shared/constants');
  if (req.user && req.user.role === USER_ROLES.SUPERADMIN) {
      next();
      return;
    }

    // If shop_id is provided in params, check if user has access to that shop
    const requestedShopId = getShopId ? getShopId(req) : parseInt(req.params.shop_id);
    
    if (requestedShopId) {
      // Users can only access their own shop - handle type coercion
  const userShopId = req.user && req.user.shop_id ? Number(req.user.shop_id) : null;
      if (userShopId !== requestedShopId) {
        failureCode(res, 403, ErrorCodes.SHOP_ACCESS_DENIED, undefined, 
          `Access denied: User shop_id (${req.user?.shop_id}) does not match requested shop (${requestedShopId})`);
        return;
      }
    }

    next();
  };
};

/**
 * Middleware to check if user can access their own resource or has admin privileges
 * @param getUserId - Function to extract user_id from request params
 */
export const requireSelfOrAdmin = (getUserId?: (req: AuthenticatedRequest) => number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
      failureCode(res, 401, ErrorCodes.AUTH_REQUIRED, undefined, 'Authentication required');
      return;
    }

    const requestedUserId = getUserId ? getUserId(req) : parseInt(req.params.id || req.params.userId);
    
    // Superadmin and owners can access any user
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { USER_ROLES } = require('../shared/constants');
  if (req.user && (req.user.role === USER_ROLES.SUPERADMIN || req.user.role === USER_ROLES.OWNER)) {
      next();
      return;
    }

    // Users can only access their own data
  if (req.user && req.user.id !== requestedUserId) {
  failureCode(res, 403, ErrorCodes.ACCESS_DENIED, { requiredUser: requestedUserId, actualUser: req.user?.id }, 'Access denied');
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware - continues even if no valid token
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'supersecret';
      const decoded = jwt.verify(token, secret) as { 
        id: number; 
        username: string; 
        role: UserRole; 
        shop_id?: number | null;
      };
  req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        shop_id: decoded.shop_id,
      };
    } catch (error) {
      // Token is invalid, but we continue without user
  req.user = undefined;
    }
  }
  
  next();
};
