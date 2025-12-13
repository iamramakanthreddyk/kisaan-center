import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const expenseController = new ExpenseController();

// POST /api/expenses - Create a new expense
router.post('/', authenticateToken, expenseController.createExpense.bind(expenseController));

// GET /api/expenses - Get expenses with optional filters
router.get('/', authenticateToken, expenseController.getExpenses.bind(expenseController));

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', authenticateToken, expenseController.getExpenseById.bind(expenseController));

// GET /api/expenses/:id/allocation - Get expense allocation detail
router.get('/:id/allocation', authenticateToken, expenseController.getExpenseAllocation.bind(expenseController));

// PUT /api/expenses/:id - Update expense
router.put('/:id', authenticateToken, expenseController.updateExpense.bind(expenseController));

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', authenticateToken, expenseController.deleteExpense.bind(expenseController));

// GET /api/expenses/summary - Get expense summary
router.get('/summary', authenticateToken, expenseController.getExpenseSummary.bind(expenseController));

export default router;