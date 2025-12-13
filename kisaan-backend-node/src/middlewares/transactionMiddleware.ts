
import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { failure } from '../shared/http/respond';

// Validation middleware
export const validateTransactionCreation = [
  body('shop_id').isInt().withMessage('Shop ID must be an integer'),
  body('farmer_id').notEmpty().withMessage('Farmer ID is required'),
  body('buyer_id').notEmpty().withMessage('Buyer ID is required'),
  body('product_id').isInt().withMessage('Product ID must be an integer'),
  body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  // Product-level price removed; unit_price handled in transaction routes separately
  body('type').optional().isIn(['sale', 'purchase', 'credit', 'return']).withMessage('Invalid transaction type'),
  body('commission_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0-100'),
  body('payment_method').optional().isIn(['cash', 'credit', 'bank_transfer', 'upi']).withMessage('Invalid payment method'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return failure(res, 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
    next();
  }
];

export const validateTransactionUpdate = [
  param('id').isInt().withMessage('Transaction ID must be an integer'),
  body('status').optional().isIn(['pending', 'completed', 'cancelled', 'partial', 'credit', 'farmer_due']).withMessage('Invalid status'),
  body('quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  // price removed
  body('farmer_paid').optional().isFloat({ min: 0 }).withMessage('Farmer paid amount must be non-negative'),
  body('buyer_paid').optional().isFloat({ min: 0 }).withMessage('Buyer paid amount must be non-negative'),
  body('payment_method').optional().isIn(['cash', 'credit', 'bank_transfer', 'upi']).withMessage('Invalid payment method'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return failure(res, 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
    next();
  }
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('shop_id').optional().isInt().withMessage('Shop ID must be an integer'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return failure(res, 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
    next();
  }
];

// Validate payment updates
export const validatePaymentUpdate = [
  param('id').isInt().withMessage('Transaction ID must be an integer'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
  body('payment_method').optional().isIn(['cash', 'credit', 'bank_transfer', 'upi']).withMessage('Invalid payment method'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return failure(res, 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
    next();
  }
];

// Authorization middleware
import { RequestHandler } from 'express';

export const checkTransactionAccess: RequestHandler = async (req, res, next) => {
  try {
    const user = (req as { user?: unknown }).user;
    // const transactionId = req.params.id; // Removed unused variable
    if (!user) {
      return failure(res, 401, 'AUTH_REQUIRED', undefined, 'Authentication required');
    }

    // For now, allow access - implement proper authorization based on user role
    // TODO: Check if user has access to this transaction based on shop ownership, etc.

    next();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    failure(res, 500, 'AUTHZ_CHECK_FAILED', { error: errMsg }, 'Authorization check failed');
  }
};

// Validate bulk transaction creation
export const validateBulkTransactionCreation = [
  body('transactions').isArray({ min: 1 }).withMessage('Transactions array is required and must not be empty'),
  body('transactions.*.shop_id').isInt().withMessage('Shop ID must be an integer'),
  body('transactions.*.farmer_id').notEmpty().withMessage('Farmer ID is required'),
  body('transactions.*.buyer_id').notEmpty().withMessage('Buyer ID is required'),
  body('transactions.*.product_id').isInt().withMessage('Product ID must be an integer'),
  body('transactions.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  // price removed per product; expect unit_price inside transaction processor if needed
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return failure(res, 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
    next();
  }
];
