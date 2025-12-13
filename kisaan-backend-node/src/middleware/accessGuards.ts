import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';

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
    if (user.shop_id === Number(shopId)) {
      next();
      return;
    }
    // If not direct match, check if user is owner of the shop
    const { Shop } = require('../models/shop');
    Shop.findOne({ where: { id: Number(shopId), owner_id: user.id } })
      .then((shop: any) => {
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
  const farmerId = req.query.farmer_id || req.body.farmer_id;
  
  // Owner and employee have full access
  if (user && ['owner', 'employee'].includes(user.role)) {
    next();
    return;
  }
  
  // Farmer can only read their own data
  if (user && user.role === 'farmer') {
    if (req.method !== 'GET') {
      return res.status(403).json({ error: 'Forbidden: Farmers can only view their ledger' });
    }
    if (user.id !== Number(farmerId)) {
      return res.status(403).json({ error: 'Forbidden: Farmers can only view their own ledger' });
    }
    next();
    return;
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}
