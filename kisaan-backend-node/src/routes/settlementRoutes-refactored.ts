import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController';
import { logger } from '../shared/logging/logger';
import { authenticateToken } from '../middlewares/auth';
import { 
  DateUtils, 
  ResponseUtils, 
  ServiceUtils, 
  ControllerUtils
} from '../utils/routeUtils';

const router = Router();
const settlementController = new SettlementController();

// POST /api/settlements/repay-fifo - Apply repayment FIFO for a user/shop
router.post('/repay-fifo', 
  authenticateToken, 
  ControllerUtils.asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
    const missing = ControllerUtils.validateParams(req, ['shop_id', 'user_id', 'amount']);
    if (missing.length > 0) {
      return ResponseUtils.error(res, `Missing required parameters: ${missing.join(', ')}`);
    }

    const { shop_id, user_id, amount } = req.body;
    if (amount <= 0) {
      return ResponseUtils.error(res, 'Amount must be greater than 0');
    }

    const result = await ServiceUtils.executeService(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { applyRepaymentFIFO } = require('../services/settlementService');
        return applyRepaymentFIFO(parseInt(shop_id), parseInt(user_id), parseFloat(amount));
      },
  req, res, (err) => logger.error({ err }, 'FIFO repayment error')
    );

    if (result) {
      ResponseUtils.success(res, result);
    }
  })
);

// GET /api/settlements?shop_id=...&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
router.get('/', 
  authenticateToken, 
  ControllerUtils.asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
    const { shop_id, user_id, user_type, status } = req.query;
    
    if (!shop_id) {
      return ResponseUtils.error(res, 'shop_id is required');
    }

  // Use common date parsing utility - cast req.query to the expected shape
  const { startDate, endDate } = DateUtils.parseDateRange(req.query as unknown as Record<string, string | undefined>);

    const result = await ServiceUtils.executeService(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSettlements } = require('../services/settlementService');
        return getSettlements({
          shop_id: shop_id as string,
          user_id: user_id as string,
          user_type: user_type as string,
          status: status as string,
          from_date: startDate.toISOString(),
          to_date: endDate.toISOString()
        });
      },
  req, res, (err) => logger.error({ err }, 'get settlements error')
    );

    if (result) {
      ResponseUtils.success(res, result);
    }
  })
);

// Standard controller-based routes using consistent binding
router.get('/summary', 
  authenticateToken, 
  ControllerUtils.asyncHandler(
    settlementController.getSettlementSummaryController.bind(settlementController)
  )
);

router.post('/settle/:settlement_id', 
  authenticateToken, 
  ControllerUtils.asyncHandler(
    settlementController.settleAmountController.bind(settlementController)
  )
);

router.post('/expense', 
  authenticateToken, 
  ControllerUtils.asyncHandler(
    settlementController.createExpenseController.bind(settlementController)
  )
);

// POST /api/settlements - Create a new settlement
router.post('/', 
  authenticateToken, 
  ControllerUtils.asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
    const missing = ControllerUtils.validateParams(req, ['shop_id', 'amount']);
    if (missing.length > 0) {
      return ResponseUtils.error(res, `Missing required parameters: ${missing.join(', ')}`);
    }

    const { shop_id, amount, type } = req.body;
    
    // Mock response - in real implementation, would call service
    const settlementData = {
      id: Date.now(),
      shop_id,
      amount,
      type: type || 'commission',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    ResponseUtils.success(res, settlementData, 'Settlement created successfully');
  })
);

// GET /api/settlements/:id - Get settlement by ID
router.get('/:id', 
  authenticateToken, 
  ControllerUtils.asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
    const id = ControllerUtils.parseId(req.params.id);
    
    // Mock response - in real implementation, would call service
    const settlementData = {
      id,
      shop_id: 1,
      amount: 150.00,
      type: 'commission',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    ResponseUtils.success(res, settlementData);
  })
);

export default router;