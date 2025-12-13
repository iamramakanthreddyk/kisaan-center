import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { getSuperadminDashboard } from '../controllers/superadminController';

const router = Router();

// Superadmin dashboard with aggregated metrics only
router.get('/dashboard', authenticateToken, requireRole(['superadmin']), getSuperadminDashboard);

export default router;