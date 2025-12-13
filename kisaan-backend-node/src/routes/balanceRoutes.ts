import express from 'express';
import { BalanceController } from '../controllers';
import { authenticateToken } from '../middlewares/auth';
import { body, param } from 'express-validator';

const router = express.Router();

router.use(authenticateToken);

// Payment validation
const validatePayment = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('shop_id').isInt().withMessage('Shop ID is required'),
  body('description').optional().isString()
];

const balanceController = new BalanceController();

// Add payment to farmer
router.post('/payment/farmer', [
  ...validatePayment,
  body('farmer_id').notEmpty().withMessage('Farmer ID is required')
], balanceController.addPaymentToFarmer.bind(balanceController));

// Add payment from buyer  
router.post('/payment/buyer', [
  ...validatePayment,
  body('buyer_id').notEmpty().withMessage('Buyer ID is required')
], balanceController.addPaymentFromBuyer.bind(balanceController));

// Get user balance
router.get('/user/:userId', [
  param('userId').notEmpty().withMessage('User ID is required')
], balanceController.getUserBalance.bind(balanceController));

// Get shop balance
router.get('/shop/:shopId', [
  param('shopId').notEmpty().withMessage('Shop ID is required')
], balanceController.getShopBalance.bind(balanceController));

// Update balance
router.post('/update', [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat().withMessage('Amount is required'),
  body('type').isIn(['credit', 'debit']).withMessage('Type must be credit or debit')
], balanceController.updateBalance.bind(balanceController));

// Get balance history
router.get('/history/:userId', [
  param('userId').notEmpty().withMessage('User ID is required')
], balanceController.getBalanceHistory.bind(balanceController));

export { router as balanceRoutes };