import { Response } from 'express';
import { User, Shop } from '../models';
import { createSettlement } from '../services/settlementService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { paymentService } from '../services/paymentServiceInstance';
import { success, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { getSettledAmountsBatch } from '../services/settlementService';
import { PARTY_TYPE } from '../shared/partyTypes';
import { LedgerService } from '../services/ledgerService';

// Helper function to get user's shop_id
const getUserShopId = async (userId: number): Promise<number | null> => {
  const user = await User.findByPk(userId);
  if (!user) return null;
  
  // If user has direct shop_id, return it
  if (user.shop_id) return user.shop_id;
  
  // If user is owner, find their shop by user id
  if (user.role === 'owner') {
    const shop = await Shop.findOne({ where: { owner_id: user.id } });
    return shop?.id || null;
  }
  
  return null;
};

// Add payment made to farmer (increases farmer balance)
export class BalanceController {
  async addPaymentToFarmer(req: AuthenticatedRequest, res: Response) {
  try {
    const { farmer_id, amount, description } = req.body;
    let userShopId = (req as AuthenticatedRequest).user?.shop_id;
    if (!userShopId && (req as AuthenticatedRequest).user?.id) {
      userShopId = await getUserShopId((req as AuthenticatedRequest).user!.id);
    }
    if (!userShopId) {
  return failureCode(res, 400, ErrorCodes.SHOP_NOT_FOUND, undefined, 'User shop not found');
    }
    // Use PaymentService to create payment and update balances/snapshots
    const paymentData = {
      payer_type: PARTY_TYPE.SHOP,
      payee_type: PARTY_TYPE.FARMER,
      amount: Number(amount),
      method: 'CASH' as const, // or get from req.body if needed
      status: 'PAID' as const,
      notes: description || '',
      counterparty_id: Number(farmer_id),
      shop_id: userShopId,
      payment_date: new Date()
    };
  const paymentResult = await paymentService.createPayment(paymentData, (req as AuthenticatedRequest).user?.id || 0);
    // Optionally create settlement record as before
    await createSettlement({
      shop_id: userShopId,
      user_id: farmer_id,
      user_type: 'farmer',
      amount: Number(amount),
      type: 'adjustment',
      description: description || `Payment made to farmer ${farmer_id}`
    });
    success(res, { payment: paymentResult }, { message: 'Payment added successfully' });
  } catch (error) {
    (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'addPaymentToFarmer failed');
    failureCode(res, 500, ErrorCodes.ADD_PAYMENT_FARMER_FAILED, { error: (error as Error).message }, 'Failed to add payment');

  }
}

  async addPaymentFromBuyer(req: AuthenticatedRequest, res: Response) {
  try {
    const { buyer_id, amount, description } = req.body;
    let userShopId = (req as AuthenticatedRequest).user?.shop_id;
    if (!userShopId && (req as AuthenticatedRequest).user?.id) {
      userShopId = await getUserShopId((req as AuthenticatedRequest).user!.id);
    }
    if (!userShopId) {
  return failureCode(res, 400, ErrorCodes.SHOP_NOT_FOUND, undefined, 'User shop not found');
    }
    // Use PaymentService to create payment and update balances/snapshots
    const paymentData = {
      payer_type: PARTY_TYPE.BUYER,
      payee_type: PARTY_TYPE.SHOP,
      amount: Number(amount),
      method: 'CASH' as const, // or get from req.body if needed
      status: 'PAID' as const,
      notes: description || '',
      counterparty_id: Number(buyer_id),
      shop_id: userShopId,
      payment_date: new Date()
    };
  const paymentResult = await paymentService.createPayment(paymentData, (req as AuthenticatedRequest).user?.id || 0);
    // Optionally create settlement record as before
    await createSettlement({
      shop_id: userShopId,
      user_id: buyer_id,
      user_type: 'buyer',
      amount: Number(amount),
      type: 'adjustment',
      description: description || `Payment received from buyer ${buyer_id}`
    });
    success(res, { payment: paymentResult }, { message: 'Payment received successfully' });
  } catch (error) {
    (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'addPaymentFromBuyer failed');
    failureCode(res, 500, ErrorCodes.ADD_PAYMENT_BUYER_FAILED, { error: (error as Error).message }, 'Failed to record payment');

  }
}

  async getUserBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'role', 'balance', 'shop_id']
      });
      if (!user) {
        return failureCode(res, 404, ErrorCodes.USER_NOT_FOUND, undefined, 'User not found');
      }

      // OPTIMIZATION: Get pending expenses and calculate unsettled amounts efficiently
      const expenseRepo = new ExpenseRepository();
      const pendingExpenses = await expenseRepo.findPendingByUser(user.shop_id || 0, user.id);

      let pendingExpensesTotal = 0;
      if (pendingExpenses.length > 0) {
        // Batch load settled amounts for all pending expenses
        const expenseIds = pendingExpenses.map(exp => exp.id);
        const settledAmounts = await getSettledAmountsBatch(expenseIds);

        pendingExpensesTotal = pendingExpenses.reduce((total, exp) => {
          const expenseAmount = Number(exp.amount);
          const settledAmount = settledAmounts[exp.id] || 0;
          const remaining = Math.max(0, expenseAmount - settledAmount);
          return total + remaining;
        }, 0);
      }

      // USE LEDGER: Get current balance from ledger_entries, not from kisaan_users.balance
      const ledgerService = new LedgerService();
      const ledgerBalance = await ledgerService.getBalance(user.id, user.shop_id || 0);
      const currentBalance = ledgerBalance;

      // Provide an explanatory field so UI can interpret sign correctly per role.
      const balanceMeaning = user.role === 'farmer'
        ? 'positive = shop owes farmer; negative = farmer owes shop'
        : 'positive = user/buyer owes shop; negative = shop owes user/buyer';

      success(res, {
        user_id: user.id,
        username: user.username,
        role: user.role,
        current_balance: currentBalance,
        pending_expenses: pendingExpensesTotal,
        // Keep backward-compatible key name but do NOT subtract pending expenses
        effective_balance: currentBalance,
        balance_meaning: balanceMeaning
      });
    } catch (error) {
      (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'getUserBalance failed');
      failureCode(res, 500, ErrorCodes.GET_BALANCE_FAILED, { error: (error as Error).message }, 'Failed to get balance');
    }
  }

  async getShopBalance(req: AuthenticatedRequest, res: Response) {
  try {
    const { shopId } = req.params;
    
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
  return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND, undefined, 'Shop not found');
    }

    // Get all users in this shop and sum their balances
    const users = await User.findAll({
      where: { shop_id: shopId },
      attributes: ['id', 'username', 'role', 'balance']
    });

    const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);

    success(res, {
      shop_id: shopId,
      total_balance: totalBalance,
      user_count: users.length,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        balance: u.balance || 0
      }))
    });
  } catch (error) {
    (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'getShopBalance failed');
    failureCode(
      res,
      500,
      ErrorCodes.GET_SHOP_BALANCE_FAILED,
      { error: (error as Error).message },
      'Failed to get shop balance'
    );
  }
}

  async updateBalance(req: AuthenticatedRequest, res: Response) {
  try {
    const { user_id, amount, type, description } = req.body;
    
    const user = await User.findByPk(user_id);
    if (!user) {
  return failureCode(res, 404, ErrorCodes.USER_NOT_FOUND, undefined, 'User not found');
    }

    const currentBalance = user.balance || 0;
    const changeAmount = parseFloat(amount);
    const newBalance = type === 'credit' 
      ? currentBalance + changeAmount 
      : currentBalance - changeAmount;

    await user.update({ balance: newBalance });

    success(res, {
      user_id,
      previous_balance: currentBalance,
      change_amount: changeAmount,
      new_balance: newBalance,
      type,
      description
    }, { message: 'Balance updated successfully' });
  } catch (error) {
    (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'updateBalance failed');
    failureCode(
      res,
      500,
      ErrorCodes.UPDATE_BALANCE_FAILED,
      { error: (error as Error).message },
      'Failed to update balance'
    );
  }
}

  async getBalanceHistory(req: AuthenticatedRequest, res: Response) {
  try {
      // const { userId } = req.params;
    
    // For now, return empty history as we don't have a balance history table
    // In a real implementation, you'd have a balance_transactions table
    success(res, { items: [] }, { message: 'Balance history feature not implemented yet' });
  } catch (error) {
    (req as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error({ err: error }, 'getBalanceHistory failed');
    failureCode(
      res,
      500,
      ErrorCodes.BALANCE_HISTORY_FAILED,
      { error: (error as Error).message },
      'Failed to get balance history'
    );
  }
  }
}
