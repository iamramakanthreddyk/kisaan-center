import { Request, Response } from 'express';
import { SimplifiedTransactionService } from '../services/simplifiedTransactionService';
import { success, created, failure } from '../shared/http/respond';

/**
 * SIMPLIFIED CONTROLLER FOR CLEAR USER EXPERIENCE
 * 
 * Endpoints:
 * POST /api/simple/transaction - Create transaction (updates balances)
 * POST /api/simple/payment - Record payment (reduces balance) 
 * POST /api/simple/expense - Record expense/advance
 * GET /api/simple/balance/:userId - Get balance with explanation
 * GET /api/simple/shop/:shopId/summary - Shop summary
 */

export class SimplifiedController {
  private service = new SimplifiedTransactionService();
  
  /**
   * Create transaction - simple form
   * POST /api/simple/transaction
   */
  async createTransaction(req: Request, res: Response) {
    try {
      const {
        shop_id,
        farmer_id,
        buyer_id,
        category_id,
        product_name,
        quantity,
        unit_price,
        commission_rate,
        notes,
        payments
      } = req.body;
      
      // Validate required fields
      if (!shop_id || !farmer_id || !buyer_id || !category_id || !product_name || !quantity || !unit_price) {
        return failure(res, 400, 'VALIDATION_ERROR', {
          missing_fields: {
            shop_id: !shop_id,
            farmer_id: !farmer_id,
            buyer_id: !buyer_id,
            category_id: !category_id,
            product_name: !product_name,
            quantity: !quantity,
            unit_price: !unit_price
          }
        }, 'Missing required fields');
      }

      // Validate payments array if provided
      if (payments && Array.isArray(payments)) {
        for (let i = 0; i < payments.length; i++) {
          const payment = payments[i];
          if (!payment.payer_type || !payment.payee_type || payment.amount === undefined) {
            return failure(res, 400, 'VALIDATION_ERROR', {
              payment_index: i,
              missing: {
                payer_type: !payment.payer_type,
                payee_type: !payment.payee_type,
                amount: payment.amount === undefined
              }
            }, `Payment at index ${i} is missing required fields`);
          }
        }
      }
      
      const result = await this.service.createSimpleTransaction({
        shop_id,
        farmer_id,
        buyer_id,
        category_id,
        product_name,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unit_price),
        commission_rate: commission_rate ? parseFloat(commission_rate) : undefined,
        notes,
        payments
      });
      
      // Get updated balances to show user
      const farmerBalance = await this.service.getUserBalanceInfo(farmer_id);
      const buyerBalance = await this.service.getUserBalanceInfo(buyer_id);
      
      created(res, {
        transaction: result.transaction,
        payments: result.payments,
        balance_updates: {
          farmer: farmerBalance,
          buyer: buyerBalance
        }
      });
      
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      failure(res, 500, 'TRANSACTION_FAILED', { error: message });
    }
  }
  
  /**
   * Record payment - reduces user balance
   * POST /api/simple/payment
   */
  async recordPayment(req: Request, res: Response) {
    try {
      const { user_id, amount, payment_type, notes } = req.body;
      
      if (!user_id || !amount || !payment_type) {
        return failure(res, 400, 'VALIDATION_ERROR', {}, 'Missing required fields');
      }
      
      if (!['farmer_payment', 'buyer_payment'].includes(payment_type)) {
        return failure(res, 400, 'VALIDATION_ERROR', {}, 'Invalid payment_type');
      }
      
      const balanceBefore = await this.service.getUserBalanceInfo(user_id);
      
      const payment = await this.service.recordPayment({
        user_id,
        amount: parseFloat(amount),
        payment_type,
        notes
      });
      
      const balanceAfter = await this.service.getUserBalanceInfo(user_id);
      
      created(res, {
        payment,
        balance_change: {
          before: balanceBefore,
          after: balanceAfter,
          amount_paid: parseFloat(amount)
        }
      });
      
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      failure(res, 500, 'PAYMENT_FAILED', { error: message });
    }
  }
  
  /**
   * Record expense/advance
   * POST /api/simple/expense
   */
  async recordExpense(req: Request, res: Response) {
    try {
      const { user_id, amount, expense_type, description, shop_id } = req.body;
      
      if (!user_id || !amount || !expense_type || !description || !shop_id) {
        return failure(res, 400, 'VALIDATION_ERROR', {}, 'Missing required fields');
      }
      
      if (!['shop_expense', 'user_advance'].includes(expense_type)) {
        return failure(res, 400, 'VALIDATION_ERROR', {}, 'Invalid expense_type');
      }
      
      const balanceBefore = expense_type === 'user_advance' 
        ? await this.service.getUserBalanceInfo(user_id)
        : null;
      
      const expense = await this.service.recordExpense({
        user_id,
        amount: parseFloat(amount),
        expense_type,
        description,
        shop_id
      });
      
  const response: { expense: unknown; balance_change?: { before: unknown; after: unknown; advance_amount: number } } = { expense };
      
      if (expense_type === 'user_advance') {
        const balanceAfter = await this.service.getUserBalanceInfo(user_id);
        response.balance_change = {
          before: balanceBefore,
          after: balanceAfter,
          advance_amount: parseFloat(amount)
        };
      }
      
      created(res, response);
      
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      failure(res, 500, 'EXPENSE_FAILED', { error: message });
    }
  }
  
  /**
   * Get user balance with clear explanation
   * GET /api/simple/balance/:userId
   */
  async getUserBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const balanceInfo = await this.service.getUserBalanceInfo(parseInt(userId));
      
      success(res, balanceInfo);
      
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      failure(res, 500, 'BALANCE_FAILED', { error: message });
    }
  }
}
