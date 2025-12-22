// Owner-only guard - only allows shop owners
export function ownerOnlyGuard(req: Request, res: Response, next: NextFunction) {
  const user = getUser(req);
  if (user && user.role === 'owner') {
    next();
    return;
  }
  return res.status(403).json({ error: 'Forbidden: Only shop owner allowed' });
}
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Shop } from '../models/shop';

// Type guard for req.user
function getUser(req: Request) {
  return (req as AuthenticatedRequest).user;
}

// Shop owner/employee guard - allows full access to owners and employees for their shop
export function shopAccessGuard(req: Request, res: Response, next: NextFunction) {
  const user = getUser(req);
  const shopId = req.body.shop_id || req.query.shop_id || req.params.shop_id;

  // Employee must belong to the requested shop
  if (user && user.role === 'employee') {
    if (user.shop_id === Number(shopId)) {
      next();
      return;
    }
    return res.status(403).json({ error: 'Forbidden: Only shop employee allowed for this shop' });
  }

  // Owner can access any shop they own, even if user.shop_id is null or does not match
  if (user && user.role === 'owner') {
    // First check direct shop ownership via user.shop_id
    if (user.shop_id === Number(shopId)) {
      next();
      return;
    }
    // Then check database ownership via shop.owner_id
    Shop.findOne({ where: { id: Number(shopId), owner_id: user.id } })
      .then((shop: Shop | null) => {
        if (shop) {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden: Only shop owner allowed for this shop' });
        }
      })
      .catch(() => {
        res.status(500).json({ error: 'Internal server error' });
      });
    return;
  }

  return res.status(403).json({ error: 'Forbidden: Only shop owner/employee allowed' });
}

// Farmer read-only guard (allows owner/employee full access, farmer only GET their own)
export function farmerReadOnlyGuard(req: Request, res: Response, next: NextFunction) {
  const user = getUser(req);
  const farmerId = req.query.farmer_id || req.body.farmer_id || req.params.farmer_id;
  const shopId = req.query.shop_id || req.body.shop_id || req.params.shop_id;

  console.log('[farmerReadOnlyGuard] User:', user ? { id: user.id, role: user.role, shop_id: user.shop_id } : 'null');
  console.log('[farmerReadOnlyGuard] Params: farmerId=', farmerId, 'shopId=', shopId, 'method=', req.method);

  // Owner can access any shop they own
  if (user && user.role === 'owner') {
    console.log('[farmerReadOnlyGuard] User is owner, checking shop access...');
    // First check direct shop ownership via user.shop_id
    if (Number(user.shop_id) === Number(shopId)) {
      console.log('[farmerReadOnlyGuard] Owner has direct shop access via user.shop_id');
      next();
      return;
    }
    // Then check database ownership via shop.owner_id
    console.log('[farmerReadOnlyGuard] Checking database for shop ownership...');
    Shop.findOne({ where: { id: Number(shopId), owner_id: Number(user.id) } })
      .then((shop: Shop | null) => {
        if (shop) {
          console.log('[farmerReadOnlyGuard] Owner has database-verified shop access');
          next();
        } else {
          console.log('[farmerReadOnlyGuard] Owner does NOT have shop access');
          res.status(403).json({ error: 'Forbidden: Only shop owner allowed for this shop' });
        }
      })
      .catch((err) => {
        console.error('[farmerReadOnlyGuard] Database error:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
    return;
  }

  // Employee must belong to the requested shop
  if (user && user.role === 'employee') {
    console.log('[farmerReadOnlyGuard] User is employee, checking shop membership...');
    if (Number(user.shop_id) === Number(shopId)) {
      console.log('[farmerReadOnlyGuard] Employee belongs to shop');
      next();
      return;
    }
    console.log('[farmerReadOnlyGuard] Employee does NOT belong to shop');
    return res.status(403).json({ error: 'Forbidden: Only shop employee allowed for this shop' });
  }
  
  // Farmer can only read their own data
  if (user && user.role === 'farmer') {
    console.log('[farmerReadOnlyGuard] User is farmer, checking permissions...');
    if (req.method !== 'GET') {
      console.log('[farmerReadOnlyGuard] Farmer trying non-GET method');
      return res.status(403).json({ error: 'Forbidden: Farmers can only view their ledger' });
    }
    if (Number(user.id) !== Number(farmerId)) {
      console.log(`[farmerReadOnlyGuard] Farmer id ${user.id} trying to access farmer ${farmerId}`);
      return res.status(403).json({ error: 'Forbidden: Farmers can only view their own ledger' });
    }
    console.log('[farmerReadOnlyGuard] Farmer access granted');
    next();
    return;
  }
  
  console.log('[farmerReadOnlyGuard] No valid user or role found');
  return res.status(401).json({ error: 'Unauthorized' });
}
