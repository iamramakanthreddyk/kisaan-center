import { Router } from 'express';
import { SimplifiedController } from '../controllers/simplifiedController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const controller = new SimplifiedController();

// Test endpoint without auth for initial testing
router.get('/test', (req, res) => {
  res.json({ message: 'Simplified system is working!', timestamp: new Date().toISOString() });
});

// Apply authentication to all other routes
router.use(authenticateToken);

/**
 * SIMPLIFIED API ROUTES
 * Clear, simple endpoints that match user expectations
 */

// Create transaction (automatically updates balances)
router.post('/transaction', controller.createTransaction.bind(controller));

// Record payment (reduces user balance toward zero)
router.post('/payment', controller.recordPayment.bind(controller));

// Record expense or advance (affects balances appropriately)
router.post('/expense', controller.recordExpense.bind(controller));

// Get user balance with clear explanation
router.get('/balance/:userId', controller.getUserBalance.bind(controller));

export default router;