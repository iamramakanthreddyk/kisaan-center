/**
 * Balance Reconciliation Controller
 * API endpoints for balance validation and reconciliation
 */

import { Response } from 'express';
import { balanceReconciliationService } from '../balance-reconciliation-service';
import { success, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { AuthenticatedRequest } from '../middlewares/auth';
import { parseId } from '../shared/utils/parse';

export class BalanceReconciliationController {

  /**
   * GET /api/balance/reconcile/user/:userId
   * Check if a user's balance matches their ledger entries
   */
  async reconcileUserBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseId(req.params.userId, 'user');
      const result = await balanceReconciliationService.reconcileUserBalance(userId);
      
      return success(res, result, { 
        message: result.isReconciled ? 'Balance is reconciled' : 'Balance discrepancy found' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'balance reconciliation failed');
      return failureCode(res, 500, ErrorCodes.BALANCE_HISTORY_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * GET /api/balance/reconcile/payment/:paymentId  
   * Check if a payment is properly allocated to transactions
   */
  async reconcilePaymentAllocations(req: AuthenticatedRequest, res: Response) {
    try {
      const paymentId = parseId(req.params.paymentId, 'payment');
      const result = await balanceReconciliationService.reconcilePaymentAllocations(paymentId);
      
      return success(res, result, { 
        message: result.isFullyAllocated ? 'Payment is fully allocated' : 'Payment allocation discrepancy found' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'payment allocation reconciliation failed');
      return failureCode(res, 500, ErrorCodes.CREATE_PAYMENT_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * GET /api/balance/reconcile/transaction/:transactionId
   * Check if transaction payment status matches actual payments
   */
  async reconcileTransactionPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const transactionId = parseId(req.params.transactionId, 'transaction');
      const result = await balanceReconciliationService.reconcileTransactionPayments(transactionId);
      
      return success(res, result, { 
        message: result.statusMatches ? 'Transaction status is correct' : 'Transaction status discrepancy found' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction payment reconciliation failed');
      return failureCode(res, 500, ErrorCodes.TRANSACTION_UPDATE_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * GET /api/balance/audit/shop/:shopId
   * Comprehensive balance audit for a shop
   */
  async auditShopBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = parseId(req.params.shopId, 'shop');
      const result = await balanceReconciliationService.auditShopBalances(shopId);
      
      return success(res, result, { 
        message: result.overallHealthy ? 'Shop balances are healthy' : 'Shop balance issues found' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'shop balance audit failed');
      return failureCode(res, 500, ErrorCodes.BALANCE_HISTORY_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * POST /api/balance/fix/user/:userId
   * Fix user balance discrepancy by updating to match ledger
   */
  async fixUserBalanceDiscrepancy(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseId(req.params.userId, 'user');
      const result = await balanceReconciliationService.fixUserBalanceDiscrepancy(userId);
      
      return success(res, { fixed: result }, { 
        message: 'User balance discrepancy fixed' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'balance fix failed');
      return failureCode(res, 500, ErrorCodes.BALANCE_HISTORY_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * GET /api/balance/report/shop/:shopId
   * Generate comprehensive balance report for a shop
   */
  async generateBalanceReport(req: AuthenticatedRequest, res: Response) {
    try {
      const shopId = parseId(req.params.shopId, 'shop');
      const report = await balanceReconciliationService.generateBalanceReport(shopId);
      
      return success(res, report, { 
        message: 'Balance report generated successfully' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'balance report generation failed');
      return failureCode(res, 500, ErrorCodes.BALANCE_HISTORY_FAILED, undefined, (error as Error).message);
    }
  }

  /**
   * GET /api/balance/health
   * Overall system balance health check
   */
  async systemBalanceHealthCheck(req: AuthenticatedRequest, res: Response) {
    try {
      // This could check all shops or provide a system-wide health overview
      const healthMetrics = {
        timestamp: new Date(),
        message: 'Balance reconciliation service is operational',
        features: [
          'User balance reconciliation',
          'Payment allocation validation', 
          'Transaction status verification',
          'Shop balance auditing',
          'Automated discrepancy fixing',
          'Comprehensive reporting'
        ]
      };
      
      return success(res, healthMetrics, { 
        message: 'Balance reconciliation system is healthy' 
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'balance health check failed');
      return failureCode(res, 500, ErrorCodes.BALANCE_HISTORY_FAILED, undefined, (error as Error).message);
    }
  }
}

export const balanceReconciliationController = new BalanceReconciliationController();
