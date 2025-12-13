/**
 * Balance Reconciliation Routes
 * API routes for balance validation and reconciliation
 */

import { Router } from 'express';
import { balanceReconciliationController } from '../controllers/balanceReconciliationController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// User balance reconciliation
router.get('/reconcile/user/:userId', balanceReconciliationController.reconcileUserBalance.bind(balanceReconciliationController));

// Payment allocation reconciliation  
router.get('/reconcile/payment/:paymentId', balanceReconciliationController.reconcilePaymentAllocations.bind(balanceReconciliationController));

// Transaction payment reconciliation
router.get('/reconcile/transaction/:transactionId', balanceReconciliationController.reconcileTransactionPayments.bind(balanceReconciliationController));

// Shop balance audit
router.get('/audit/shop/:shopId', balanceReconciliationController.auditShopBalances.bind(balanceReconciliationController));

// Fix user balance discrepancy
router.post('/fix/user/:userId', balanceReconciliationController.fixUserBalanceDiscrepancy.bind(balanceReconciliationController));

// Generate balance report
router.get('/report/shop/:shopId', balanceReconciliationController.generateBalanceReport.bind(balanceReconciliationController));

// System health check
router.get('/health', balanceReconciliationController.systemBalanceHealthCheck.bind(balanceReconciliationController));

export default router;