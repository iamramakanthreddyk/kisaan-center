import express from 'express';
import { CommissionController } from '../controllers';
import { success, failure } from '../shared/http/respond';

const router = express.Router();
const commissionController = new CommissionController();

// router.use(authenticateToken);

router.post('/', commissionController.createCommission.bind(commissionController));
router.get('/', commissionController.getAllCommissions.bind(commissionController));
router.get('/shop/:shopId', commissionController.getCommissionsByShop.bind(commissionController));
router.put('/:id', commissionController.updateCommission.bind(commissionController));

// POST /api/commissions/calculate - Calculate commission for an amount
router.post('/calculate', async (req, res) => {
  try {
    const { shop_id, amount } = req.body;
    
    if (!shop_id || !amount) {
      return failure(res, 400, 'VALIDATION_ERROR', { fields: ['shop_id','amount'] }, 'shop_id and amount are required');
    }

    // Mock calculation - 15% commission
    const commission_amount = Number(amount) * 0.15;
    
    success(res, {
      shop_id,
      amount: Number(amount),
      commission_rate: 15,
      commission_amount
    });
  } catch (error) {
    failure(res, 500, 'COMMISSION_CALC_FAILED');
  }
});

export { router as commissionRoutes };