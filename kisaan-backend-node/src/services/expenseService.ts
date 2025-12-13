import { ExpenseRepository } from '../repositories/ExpenseRepository';
import Expense, { ExpenseStatus, ExpenseCreationAttributes } from '../models/expense';
import ExpenseSettlement from '../models/expenseSettlement';
import { User } from '../models/user';
import { TransactionLedger } from '../models/transactionLedger';
import sequelize from '../config/database';

export interface CreateExpenseData {
  shop_id: number;
  user_id: number;
  amount: number;
  type: string;
  description: string;
  transaction_id?: number | null;
}

export interface GetExpensesFilters {
  shop_id: string;
  user_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseUserSummary {
  user_id: number;
  username: string;
  role: string;
  balance: number;
  total_amount: number;
  pending_count: number;
}

// Create a new expense
export const createExpense = async (data: CreateExpenseData, options?: { tx?: import('sequelize').Transaction }) => {
  const expenseRepo = new ExpenseRepository();
  const expenseData: ExpenseCreationAttributes = {
    shop_id: data.shop_id,
    user_id: data.user_id,
    amount: data.amount,
    type: data.type as 'expense' | 'advance' | 'adjustment',
    description: data.description,
    transaction_id: data.transaction_id || null,
    status: ExpenseStatus.Pending
  };
  const expense = await expenseRepo.create(expenseData, options);

  console.log('[EXPENSE] Expense created', {
    expenseId: expense?.id,
    type: data.type,
    userId: data.user_id,
    amount: data.amount,
    status: 'pending'
  });

  // ❌ DO NOT UPDATE USER BALANCE HERE! ❌
  // Expenses are tracked in the Expense table, and transactionService.updateUserBalances()
  // already subtracts unsettled expenses from farmer balance (line 1627).
  // Updating balance here would DOUBLE-COUNT expenses!
  //
  // Balance calculation logic (in transactionService.ts):
  // Farmer Balance = Unpaid Transaction Earnings - Unsettled Expenses
  //
  // When expense is created, it's added to Expense table as "pending"
  // When transaction is created/updated, updateUserBalances() fetches all expenses
  // and subtracts unsettled amounts automatically.

  // Adjust existing payments for retroactive expense
  try {
    const { PaymentService } = await import('./paymentService');
    const paymentService = new PaymentService();

    const adjustmentResult = await paymentService.adjustPaymentsForExpense(
      data.shop_id,
      data.user_id,
      data.amount,
      expense!.id,
      options
    );

    if (adjustmentResult.totalAdjusted > 0) {
      console.log('[EXPENSE] Payments adjusted for retroactive expense', {
        expenseId: expense!.id,
        totalAdjusted: adjustmentResult.totalAdjusted,
        adjustedPaymentsCount: adjustmentResult.adjustedPayments.length
      });
    }
  } catch (error) {
    console.error('[EXPENSE] Failed to adjust payments for expense', {
      expenseId: expense!.id,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't fail expense creation if payment adjustment fails
  }

  // Record expense in transaction ledger
  await TransactionLedger.create({
    user_id: data.user_id,
    transaction_id: null,
    delta_amount: data.amount,
    role: 'farmer',
    reason_code: 'EXPENSE',
    created_at: new Date()
  }, { transaction: options?.tx });

  // ❌ REMOVE THIS BALANCE UPDATE - Causes double-counting!
  // Balance calculation logic (in transactionService.ts):
  // Farmer Balance = Unpaid Transaction Earnings - Unsettled Expenses
  //
  // When expense is created, it's added to Expense table as "pending"
  // When transaction is created/updated, updateUserBalances() fetches all expenses
  // and subtracts unsettled amounts automatically.
  //
  // DO NOT update balance here - it causes double-counting!

  // Update user balance - REMOVED to prevent double-counting
  // const { User } = await import('../models/user');
  // await User.update(
  //   { balance: sequelize.literal(`balance + ${data.amount}`) },
  //   { where: { id: data.user_id }, transaction: options?.tx }
  // );

  return expense;
};

// Get expenses with filters - NOW INCLUDES settled/unsettled amounts and pagination
export const getExpenses = async (filters: GetExpensesFilters) => {
  const repo = new ExpenseRepository();
  const shopId = parseInt(filters.shop_id);
  const page = filters.page || 1;
  const limit = filters.limit || 20;

  // Build filters for repository
  const repoFilters: { user_id?: number; status?: string } = {};
  if (filters.user_id) {
    repoFilters.user_id = parseInt(filters.user_id);
  }
  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Use paginated query
  const result = await repo.findAllByShopPaginated(shopId, page, limit, repoFilters);

  // Calculate settled and unsettled amounts for each expense
  const expenseDetails = await Promise.all(
    result.expenses.map(async (expense) => {
      const expenseAmount = Number(expense.amount || 0);

      // Get settlements for this expense
      const settlements = await ExpenseSettlement.findAll({
        where: { expense_id: expense.id }
      });
      const settledAmount = settlements.reduce((sum: number, s) =>
        sum + Number(s.amount || 0), 0);

      const unsettledAmount = Math.max(0, expenseAmount - settledAmount);

      return {
        ...expense.toJSON(),
        settled: settledAmount,
        unsettled: unsettledAmount
      };
    })
  );

  return {
    expenses: expenseDetails,
    total: result.total,
    page: result.page,
    limit: result.limit
  };
};

// Get expense summary by shop
export const getExpenseSummary = async (shop_id: string) => {
  const repo = new ExpenseRepository();
  const expenses = await repo.findAllByShop(parseInt(shop_id));
  const users = await User.findAll({ where: { shop_id: shop_id } });
  const summary: { [userId: number]: ExpenseUserSummary } = {};

  // Get all settlements for these expenses in one query
  const expenseIds = expenses.map(e => e.id);
  const settlements = await ExpenseSettlement.findAll({
    where: { expense_id: expenseIds },
    attributes: [
      'expense_id',
      [ExpenseSettlement.sequelize!.fn('SUM', ExpenseSettlement.sequelize!.col('amount')), 'total_settled']
    ],
    group: ['expense_id'],
    raw: true
  });

  const settlementMap = new Map<number, number>();
  settlements.forEach((s) => {
    settlementMap.set(s.expense_id as number, parseFloat((s as { total_settled?: string }).total_settled || '0'));
  });

  for (const e of expenses) {
    const user = users.find(u => u.id === e.user_id);
    if (!user) continue;

    const expenseAmount = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
    const settledAmount = settlementMap.get(e.id) || 0;
    const pendingAmount = Math.max(0, expenseAmount - settledAmount);

    if (!summary[e.user_id]) {
      summary[e.user_id] = {
        user_id: e.user_id,
        username: user.username,
        role: user.role,
        balance: typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance,
        total_amount: 0,
        pending_count: 0
      };
    }

    summary[e.user_id].total_amount += expenseAmount;
    if (pendingAmount > 0) summary[e.user_id].pending_count++;
  }

  return Object.values(summary);
};

// Mark expense as settled
export const settleExpense = async (expense_id: number, options?: { tx?: import('sequelize').Transaction }) => {
  const repo = new ExpenseRepository();

  // Get expense before settling to know the amount
  const expense = await Expense.findByPk(expense_id, options?.tx ? { transaction: options.tx } : undefined);
  if (!expense) throw new Error('Expense not found');

  const settledAmount = Number(expense.amount || 0);

  // Mark as settled
  const result = await repo.markSettled(expense_id, options);

  // Update farmer balance: increase by settled amount (less debt)
  if (settledAmount > 0) {
    const { User } = await import('../models/user');
    await User.update(
      { balance: sequelize.literal(`balance + ${settledAmount}`) },
      { where: { id: expense.user_id }, transaction: options?.tx }
    );

    console.log('[EXPENSE] Balance updated on settlement', {
      expenseId: expense_id,
      userId: expense.user_id,
      settledAmount,
      balanceIncrease: settledAmount
    });
  }

  return result;
};

// Partially or fully settle an expense
export const settleExpenseAmount = async (expense_id: number, amount: number, payment_id?: number, options?: { tx?: import('sequelize').Transaction }) => {
  const repo = new ExpenseRepository();
  const e = await Expense.findByPk(expense_id, options?.tx ? { transaction: options.tx } : undefined);
  if (!e) throw new Error('Expense not found');

  const originalAmount = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;

  // Create settlement record for audit trail
  await ExpenseSettlement.create({
    expense_id: expense_id,
    payment_id: payment_id || undefined,
    amount: amount,
    settled_at: new Date(),
    notes: payment_id ? `Settled via payment ${payment_id}` : 'Manual settlement'
  }, options?.tx ? { transaction: options.tx } : undefined);

  if (amount >= originalAmount) {
    // Fully settle - mark as settled and update balance
    const result = await repo.markSettled(expense_id, options);

    // Update farmer balance: increase by full amount (less debt)
    const { User } = await import('../models/user');
    await User.update(
      { balance: sequelize.literal(`balance + ${originalAmount}`) },
      { where: { id: e.user_id }, transaction: options?.tx }
    );

    console.log('[EXPENSE] Full settlement balance updated', {
      expenseId: expense_id,
      userId: e.user_id,
      settledAmount: originalAmount,
      balanceIncrease: originalAmount
    });

    return result;
  } else {
    // Partial settle: create settlement record but keep expense pending
    // Balance increases by settled amount
    const { User } = await import('../models/user');
    await User.update(
      { balance: sequelize.literal(`balance + ${amount}`) },
      { where: { id: e.user_id }, transaction: options?.tx }
    );

    console.log('[EXPENSE] Partial settlement balance updated', {
      expenseId: expense_id,
      userId: e.user_id,
      settledAmount: amount,
      balanceIncrease: amount,
      remainingExpense: originalAmount - amount
    });

    return e;
  }
};