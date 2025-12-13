import { Router } from 'express';
import * as controller from '../controllers/simpleFarmerLedgerController';
import { authenticateToken } from '../middlewares/auth';
import { shopAccessGuard, farmerReadOnlyGuard } from '../middleware/accessGuards';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create, update, delete require shop owner/employee
router.post('/', shopAccessGuard, controller.createEntry);
router.put('/:id', shopAccessGuard, controller.updateEntry);
router.delete('/:id', shopAccessGuard, controller.deleteEntry);

// List, balance, summary: owner/employee full, farmer read-only
router.get('/', farmerReadOnlyGuard, controller.listEntries);
router.get('/balance', farmerReadOnlyGuard, controller.getFarmerBalance);
router.get('/summary', farmerReadOnlyGuard, controller.getSummary);
// Earnings: only shop owners/employees can view earnings
router.get('/earnings', shopAccessGuard, controller.getEarnings);

export default router;
