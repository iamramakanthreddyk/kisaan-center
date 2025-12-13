import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController';
import { success, created, failure } from '../shared/http/respond';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const settlementController = new SettlementController();
const controller = new SettlementController();

// Utility: expand YYYY-MM-DD to full day ISO string
function expandToFullDay(dateStr: string, isEnd: boolean): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return isEnd
      ? `${dateStr}T23:59:59.999Z`
      : `${dateStr}T00:00:00.000Z`;
  }
  return dateStr;
}

// GET /api/settlements/farmer-net-payable?shop_id=...&farmer_id=... - Get net payable amount for farmer
router.get('/farmer-net-payable', authenticateToken, controller.getFarmerNetPayableController.bind(controller));

// POST /api/settlements/repay-fifo - Apply repayment FIFO for a user/shop
router.post('/repay-fifo', authenticateToken, async (req, res) => {
  try {
    const { shop_id, user_id, amount } = req.body;
    if (!shop_id || !user_id || !amount || amount <= 0) {
      return failure(res, 400, 'VALIDATION_ERROR', { fields: ['shop_id','user_id','amount'] }, 'shop_id, user_id, and valid amount are required');
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { applyRepaymentFIFO } = require('../services/settlementService');
    const result = await applyRepaymentFIFO(parseInt(shop_id), parseInt(user_id), parseFloat(amount));
    success(res, result);
  } catch (error: unknown) {
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : String(error);
    failure(res, 500, 'FIFO_REPAY_FAILED', { error: message });
  }
});

// GET /api/settlements?shop_id=...&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { shop_id, user_id, user_type, status, from_date, to_date } = req.query;
    if (!shop_id) {
      return failure(res, 400, 'VALIDATION_ERROR', { fields: ['shop_id'] }, 'shop_id is required');
    }
    // Expand date strings to ISO
    const expandedFromDate = from_date ? expandToFullDay(from_date as string, false) : undefined;
    const expandedToDate = to_date ? expandToFullDay(to_date as string, true) : undefined;
    // Call service directly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSettlements } = require('../services/settlementService');
    const settlements = await getSettlements({
      shop_id: shop_id as string,
      user_id: user_id as string,
      user_type: user_type as string,
      status: status as string,
      from_date: expandedFromDate,
      to_date: expandedToDate
    });
    success(res, settlements);
  } catch (error: unknown) {
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : String(error);
    failure(res, 500, 'GET_SETTLEMENTS_FAILED', { error: message });
  }
});

router.get('/summary', authenticateToken, settlementController.getSettlementSummaryController.bind(settlementController));
router.post('/settle/:settlement_id', authenticateToken, settlementController.settleAmountController.bind(settlementController));
router.post('/expense', authenticateToken, settlementController.createExpenseController.bind(settlementController));

// POST /api/settlements - Create a new settlement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { shop_id, amount, type } = req.body;
    created(res, {
      id: Date.now(),
      shop_id,
      amount,
      type: type || 'commission',
      status: 'pending',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    failure(res, 500, 'CREATE_SETTLEMENT_FAILED');
  }
});

// GET /api/settlements/:id - Get settlement by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    success(res, {
      id: Number(id),
      shop_id: 1,
      amount: 150.00,
      type: 'commission',
      status: 'pending',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    failure(res, 500, 'GET_SETTLEMENT_FAILED');
  }
});

// PATCH /api/settlements/:id/status - Update settlement status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    success(res, {
      id: Number(id),
      status,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    failure(res, 500, 'UPDATE_SETTLEMENT_STATUS_FAILED');
  }
});

export default router;