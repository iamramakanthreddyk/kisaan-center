export interface ExpenseUserSummary {
  user_id: number;
  username: string;
  role: string;
  balance: number;
  total_amount: number;
  pending_count: number;
}

import { User } from '../models/user';
import ExpenseRepository from '../repositories/ExpenseRepository';
import ExpenseSettlement from '../models/expenseSettlement';
import { ExpenseStatus, ExpenseCreationAttributes } from '../models/expense';

// OPTIMIZATION: Batch load settled amounts for multiple expenses in one query
export const getSettledAmountsBatch = async (expenseIds: number[], transaction?: import('sequelize').Transaction): Promise<Record<number, number>> => {
  if (expenseIds.length === 0) return {};

  interface SettlementResult {
    expense_id: number;
    total_settled: string;
  }

  const settlements = await ExpenseSettlement.findAll({
    where: { expense_id: expenseIds },
    attributes: [
      'expense_id',
      [ExpenseSettlement.sequelize!.fn('SUM', ExpenseSettlement.sequelize!.col('amount')), 'total_settled']
    ],
    group: ['expense_id'],
    raw: true,
    transaction
  }) as unknown as SettlementResult[];

  const result: Record<number, number> = {};
  settlements.forEach((s) => {
    result[s.expense_id] = parseFloat(s.total_settled || '0');
  });

  // Initialize missing expenses with 0
  expenseIds.forEach(id => {
    if (!(id in result)) result[id] = 0;
  });

  return result;
};

// FIFO repayment logic: When a payment is made, settle oldest pending settlements first
export const applyRepaymentFIFO = async (shop_id: number, user_id: number, repaymentAmount: number, payment_id?: number, options?: { tx?: import('sequelize').Transaction, dryRun?: boolean }) => {
  const expenseRepo = new ExpenseRepository();
  const pendingExpenses = await expenseRepo.findPendingByUser(shop_id, user_id, options);

  // OPTIMIZATION: Batch load settled amounts for all expenses in one query
  const expenseIds = pendingExpenses.map(exp => exp.id);
  const settledAmounts = await getSettledAmountsBatch(expenseIds, options?.tx);

  let remaining = repaymentAmount;
  const settlements: Array<{ expenseId: number; settledAmount: number; isFullySettled: boolean }> = [];

  for (const exp of pendingExpenses) {
    if (remaining <= 0) break;

    const expenseAmount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount;
    // Use pre-loaded settled amount instead of separate query per expense
    const settledAmount = settledAmounts[exp.id] || 0;
    const remainingExpenseAmount = expenseAmount - settledAmount;

    if (remainingExpenseAmount <= 0) continue; // Already fully settled

    const settleAmt = Math.min(remaining, remainingExpenseAmount);

    // Create settlement record unless this is a dry run
    if (!options?.dryRun) {
      await ExpenseSettlement.create({
        expense_id: exp.id,
        payment_id: payment_id,
        amount: settleAmt,
        settled_at: new Date(),
        notes: `Settled via payment ${payment_id || 'unknown'}`
      }, options?.tx ? { transaction: options.tx } : undefined);
    }

    // Check if expense is now fully settled
    const newSettledAmount = settledAmount + settleAmt;
    const isFullySettled = newSettledAmount >= expenseAmount;

    if (isFullySettled && !options?.dryRun) {
      // Use service method that updates balance instead of repository method
      const { settleExpense } = await import('./expenseService');
      await settleExpense(exp.id, options);
    }

    settlements.push({
      expenseId: exp.id,
      settledAmount: settleAmt,
      isFullySettled
    });

    remaining -= settleAmt;
  }

  return { settlements, remaining };
};

export interface CreateExpenseInput {
  shop_id: number;
  user_id: string;
  user_type: 'farmer' | 'buyer';
  transaction_id?: number;
  amount: number;
  // Allow flexible types to preserve backward compatibility with legacy callers
  type: string;
  description: string;
}

export const createExpense = async (data: CreateExpenseInput, options?: { tx?: import('sequelize').Transaction }) => {
  const expenseRepo = new ExpenseRepository();
  const expenseData: ExpenseCreationAttributes = {
    shop_id: data.shop_id,
    user_id: parseInt(data.user_id),
    amount: data.amount,
    type: data.type as 'expense' | 'advance' | 'adjustment',
    description: data.description,
    transaction_id: data.transaction_id || null,
    status: ExpenseStatus.Pending
  };
  const expense = await expenseRepo.create(expenseData, options);

  console.log('[EXPENSE] Expense created', {
    expenseId: expense.id,
    type: data.type,
    userId: parseInt(data.user_id),
    amount: data.amount,
    status: 'pending'
  });

  return expense;
};
// Expense-only APIs
export interface GetExpensesFilters {
  shop_id: string;
  user_id?: string;
  user_type?: string;
  status?: string; // unused for now, could be 'pending' or 'settled'
  from_date?: string;
  to_date?: string;
}

export const getExpenses = async (filters: GetExpensesFilters) => {
  const repo = new ExpenseRepository();
  const shopId = parseInt(filters.shop_id);
  const all = await repo.findAllByShop(shopId);
  let result = all;
  if (filters.user_id) {
    const uid = parseInt(filters.user_id);
    result = result.filter(e => e.user_id === uid);
  }
  // filtering by status/dates can be added here
  return result;
};

export const getFarmerNetPayable = async (shop_id: number, farmer_id: number) => {
  const farmer = await User.findByPk(farmer_id);
  const currentBalance = Number(farmer?.balance || 0);
  const repo = new ExpenseRepository();
  const totalPendingExpenses = await repo.getPendingTotal(shop_id, farmer_id);
  const pendingExpenses = await repo.findPendingByUser(shop_id, farmer_id);
  const expenses_breakdown = pendingExpenses.map(exp => ({ id: exp.id, amount: exp.amount, created_at: exp.created_at, description: exp.description }));
  // NOTE: `currentBalance` is maintained by TransactionService/PaymentService as:
  //    unpaidTransactionEarnings - totalUnsettledExpenses
  // In other words, the stored user.balance already accounts for unsettled expenses.
  // Subtracting `totalPendingExpenses` again would double-count expense deductions.
  // Therefore return the stored balance as the net payable (clamped to >= 0).
  return {
    farmer_id,
    current_balance: currentBalance,
    pending_expenses: totalPendingExpenses,
    net_payable: Math.max(0, currentBalance),
    expenses_breakdown
  };
};

export const getExpenseSummary = async (shop_id: string) => {
  const repo = new ExpenseRepository();
  const expenses = await repo.findAllByShop(parseInt(shop_id));
  const users: import('../models/user').User[] = await import('../models/user').then(m => m.User.findAll({ where: { shop_id: shop_id } }));
  const summary: { [userId: number]: ExpenseUserSummary } = {};
  for (const e of expenses) {
    const user = users.find(u => u.id === e.user_id);
    if (!user) continue;
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
  summary[e.user_id].total_amount += typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
    if (e.status === ExpenseStatus.Pending) summary[e.user_id].pending_count++;
  }
  return Object.values(summary);
};

export const settleExpense = async (expense_id: number) => {
  const repo = new ExpenseRepository();
  return await repo.markSettled(expense_id);
};

export const settleAmount = async (expense_id: number, amount: number, options?: { tx?: import('sequelize').Transaction }) => {
  const repo = new ExpenseRepository();
  const e = await (await import('../models/expense')).default.findByPk(expense_id);
  if (!e) throw new Error('Expense not found');
  const originalAmount = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
  if (amount >= originalAmount) {
    // fully settle
    return await repo.markSettled(expense_id, options);
  }
  // partial settle: reduce amount and save
  e.amount = originalAmount - amount;
  await e.save(options?.tx ? { transaction: options.tx } : undefined);
  return e;
};

// export a light service if other modules expect a service object
export const expenseService = {
  createExpense,
  getExpenses,
  applyRepaymentFIFO,
  getFarmerNetPayable,
  getExpenseSummary,
  settleExpense
};

// Backwards-compatible aliases (legacy callers/controllers expect these names)
export const getSettlements = getExpenses;
export const getSettlementSummary = getExpenseSummary;
export const createSettlement = createExpense;
export const settlementService = expenseService;