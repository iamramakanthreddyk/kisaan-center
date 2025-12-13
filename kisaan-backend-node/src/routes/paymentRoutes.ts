import express from 'express';
import { PaymentController } from '../controllers';
import { CreatePaymentSchema, UpdatePaymentStatusSchema, BulkPaymentSchema } from '../schemas/payment';
import { authenticateToken } from '../middlewares/auth';
import { validateSchema } from '../middlewares/validation';

const router = express.Router();
const paymentController = new PaymentController();

// Apply authentication to all routes
router.use(authenticateToken);

// Payment routes
router.get('/', async (req, res) => {
  try {
    // Compatibility: allow callers to fetch payments by transaction using ?transaction_id=123
    const { transaction_id } = req.query as { transaction_id?: string };
    if (transaction_id) {
      const txnId = Number(transaction_id);
      if (Number.isNaN(txnId)) {
        return res.status(400).json({ success: false, error: 'Invalid transaction_id' });
      }
      // Lazy-require service to avoid circular imports at module load time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PaymentService = require('../services/paymentService').PaymentService;
      const svc = new PaymentService();
      const payments = await svc.getPaymentsByTransaction(txnId);
      return res.json({ success: true, data: payments });
    }

    // Default: no-op list (kept for backward compatibility)
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
});
router.post('/', validateSchema(CreatePaymentSchema), paymentController.createPayment.bind(paymentController));
router.post('/bulk', validateSchema(BulkPaymentSchema), paymentController.createBulkPayments.bind(paymentController));
router.put('/:id/status', validateSchema(UpdatePaymentStatusSchema), paymentController.updatePaymentStatus.bind(paymentController));
router.get('/transaction/:transactionId', paymentController.getPaymentsByTransaction.bind(paymentController));
router.get('/outstanding', paymentController.getOutstandingPayments.bind(paymentController));

// Farmer and buyer reporting endpoints (for direct access via /payments)
router.get('/farmers/:farmerId', paymentController.getPaymentsToFarmer.bind(paymentController));
router.get('/buyers/:buyerId', paymentController.getPaymentsByBuyer.bind(paymentController));

export { router as paymentRoutes };