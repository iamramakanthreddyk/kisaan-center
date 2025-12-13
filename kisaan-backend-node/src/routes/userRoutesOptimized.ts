/**
 * Optimized User Routes - Uses the new optimized controllers and services
 * Provides improved performance with single queries and caching
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import {
  getAllUsersOptimized,
  getUsersByShopOptimized,
  getUsersWithBalanceOptimized,
  createUserOptimizedController,
  updateUserOptimizedController,
  clearUserCacheController,
  userServiceHealthCheck
} from '../controllers/userControllerOptimized';

const router = express.Router();

/**
 * Health check endpoint for the optimized user service
 * GET /api/v2/users/health
 */
router.get('/health', userServiceHealthCheck);

/**
 * Get all users with optimized querying and pagination
 * GET /api/v2/users
 * Query params: role, shop_id, search, page, limit
 * Features: Single query with JOINs, proper pagination, role-based filtering
 */
router.get('/', 
  authenticateToken, 
  getAllUsersOptimized
);

/**
 * Get users by shop with caching
 * GET /api/v2/users/shop/:shopId
 * Query params: refresh (boolean to force cache refresh)
 * Features: Smart caching, automatic cache invalidation, permission checks
 */
router.get('/shop/:shopId', 
  authenticateToken,
  requireRole(['owner', 'superadmin']),
  getUsersByShopOptimized
);

/**
 * Get users with balance information
 * GET /api/v2/users/shop/:shopId/balance
 * Features: Single query with balance calculation, summary statistics
 */
router.get('/shop/:shopId/balance',
  authenticateToken,
  requireRole(['owner', 'superadmin']),
  getUsersWithBalanceOptimized
);

/**
 * Create new user with optimized flow
 * POST /api/v2/users
 * Features: Automatic cache invalidation, permission validation, proper error handling
 */
router.post('/',
  authenticateToken,
  requireRole(['owner', 'superadmin']),
  createUserOptimizedController
);

/**
 * Update user with optimized flow
 * PUT /api/v2/users/:id
 * Features: Automatic cache invalidation, permission checks, atomic updates
 */
router.put('/:id',
  authenticateToken,
  requireRole(['owner', 'superadmin']),
  updateUserOptimizedController
);

/**
 * Clear user cache for a specific shop
 * DELETE /api/v2/users/shop/:shopId/cache
 * Utility endpoint for manual cache management
 */
router.delete('/shop/:shopId/cache',
  authenticateToken,
  requireRole(['owner', 'superadmin']),
  clearUserCacheController
);

export default router;