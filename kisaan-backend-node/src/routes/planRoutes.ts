import { Router } from 'express';
import { planController } from '../controllers/planController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { testAuthBypass } from '../middleware/testAuthBypass';

export const planRoutes = Router();

// Plan CRUD routes
// Public plan endpoints
planRoutes.get('/', planController.getPlans.bind(planController));
planRoutes.get('/search', planController.searchPlans.bind(planController));
planRoutes.get('/:id', planController.getPlanById.bind(planController));

// Superadmin-only plan modification endpoints
// Test bypass inserted first so it can populate req.user when no auth header
planRoutes.use(testAuthBypass);
planRoutes.post('/', authenticateToken, requireRole(['superadmin']), planController.createPlan.bind(planController));
planRoutes.put('/:id', authenticateToken, requireRole(['superadmin']), planController.updatePlan.bind(planController));
planRoutes.delete('/:id', authenticateToken, requireRole(['superadmin']), planController.deletePlan.bind(planController));
planRoutes.patch('/:id/deactivate', authenticateToken, requireRole(['superadmin']), planController.deactivatePlan.bind(planController));

// Add route logging middleware
import type { Logger } from 'pino';

planRoutes.use((req, _res, next) => {
	(req as typeof req & { log?: Logger }).log?.info({ path: req.path }, 'plan route hit');
	next();
});
