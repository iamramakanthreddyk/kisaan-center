/**
 * Optimized User Controller - Uses the new optimized services
 * Eliminates N+1 queries and improves API response times
 */

import { Request, Response } from 'express';
import { 
  getUsersWithShopInfo,
  getUsersByShopCached,
  getUsersWithBalance,
  createUserOptimized,
  updateUserOptimized,
  PermissionService,
  UserCache
} from '../services/userServiceOptimized';
// AuthRequest interface - extends Express Request with user info
interface AuthRequest extends Request {
  user?: {
    id: number;
    role: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
    shop_id?: number | null;
    username: string;
  };
}
import { ValidationError, AuthorizationError } from '../shared/utils/errors';
import { UserFilters } from '../types/user';

/**
 * Get all users with optimized querying
 * Single query instead of N+1 queries
 */
export const getAllUsersOptimized = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    
    const filters: UserFilters = {
      role: req.query.role as string,
      shop_id: req.query.shop_id ? parseInt(req.query.shop_id as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await getUsersWithShopInfo(requestingUser, filters);
    
    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error) {
    console.error('Error in getAllUsersOptimized:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get users by shop with caching
 * Optimized for frequent frontend requests
 */
export const getUsersByShopOptimized = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    const shopId = parseInt(req.params.shopId);
    const forceRefresh = req.query.refresh === 'true';

    if (isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID'
      });
    }

    const users = await getUsersByShopCached(shopId, requestingUser, forceRefresh);
    
    res.json({
      success: true,
      data: users,
      cached: !forceRefresh,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getUsersByShopOptimized:', error);
    
    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get users with balance information
 * Single query with computed balance
 */
export const getUsersWithBalanceOptimized = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    const shopId = parseInt(req.params.shopId);

    if (isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID'
      });
    }

    const users = await getUsersWithBalance(shopId, requestingUser);
    
    // Calculate summary statistics
    const summary = {
      total_users: users.length,
      farmers_count: users.filter(u => u.role === 'farmer').length,
      buyers_count: users.filter(u => u.role === 'buyer').length,
      positive_balance_count: users.filter(u => u.balance > 0).length,
      negative_balance_count: users.filter(u => u.balance < 0).length,
      total_positive_balance: users.filter(u => u.balance > 0).reduce((sum, u) => sum + u.balance, 0),
      total_negative_balance: users.filter(u => u.balance < 0).reduce((sum, u) => sum + u.balance, 0)
    };
    
    res.json({
      success: true,
      data: users,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getUsersWithBalanceOptimized:', error);
    
    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users with balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create user with optimized flow
 */
export const createUserOptimizedController = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    const userData = req.body;

    // Validation
    const requiredFields = ['username', 'firstname', 'email', 'password', 'role'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Permission check
    if (requestingUser.role === 'owner' && userData.shop_id) {
      const hasAccess = await PermissionService.checkShopAccess(
        requestingUser.id,
        requestingUser.role,
        userData.shop_id
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this shop'
        });
      }
    }

    const newUser = await createUserOptimized(userData, requestingUser);
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error in createUserOptimizedController:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update user with optimized flow
 */
export const updateUserOptimizedController = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    const userId = parseInt(req.params.id);
    const updateData = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const updatedUser = await updateUserOptimized(userId, updateData, requestingUser);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error in updateUserOptimizedController:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error instanceof AuthorizationError) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Clear user cache for a shop
 * Utility endpoint for cache management
 */
export const clearUserCacheController = async (req: AuthRequest, res: Response) => {
  try {
  const requestingUser = req.user!;
    const shopId = parseInt(req.params.shopId);

    if (isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID'
      });
    }

    // Permission check
    const hasAccess = await PermissionService.checkShopAccess(
      requestingUser.id,
      requestingUser.role,
      shopId
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this shop'
      });
    }

    UserCache.invalidateShopCache(shopId);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Error in clearUserCacheController:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Health check endpoint with cache statistics
 */
export const userServiceHealthCheck = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      service: 'User Service Optimized',
      timestamp: new Date().toISOString(),
      features: [
        'Optimized queries with JOINs',
        'Smart caching system',
        'Automatic cache invalidation',
        'Permission-based data access',
        'Single query user fetching'
      ]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
