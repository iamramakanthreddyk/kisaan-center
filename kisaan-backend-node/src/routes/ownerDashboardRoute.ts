import express from 'express';
import { OwnerDashboardService } from "../services/ownerDashboardService";
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middlewares/auth';

const router = express.Router();
const ownerDashboardService = new OwnerDashboardService();

// GET /api/owner/dashboard
router.get(
  '/dashboard',
  authenticateToken,
  requireRole(['owner']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const stats = await ownerDashboardService.getOwnerDashboardStats(ownerId.toString());
      res.json(stats);
    } catch (err) {
      console.error('Owner dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

export default router;
