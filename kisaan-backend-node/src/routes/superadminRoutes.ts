import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { getSuperadminDashboard, getUserActivityStats, getUserSessions } from '../controllers/superadminController';

const router = Router();

// Superadmin dashboard with aggregated metrics only
router.get('/dashboard', authenticateToken, requireRole(['superadmin']), getSuperadminDashboard);

// User activity monitoring
router.get('/activity', authenticateToken, requireRole(['superadmin']), getUserActivityStats);

// User sessions for specific user
router.get('/users/:userId/sessions', authenticateToken, requireRole(['superadmin']), getUserSessions);

export default router;