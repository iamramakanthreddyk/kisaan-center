import { Request, Response } from 'express';
import { createExpense, getExpenses, getExpenseSummary } from '../services/expenseService';
import { success, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { parseId } from '../shared/utils/parse';
import { Expense } from '../models/expense';

export class ExpenseController {
  async createExpense(req: Request, res: Response) {
    try {
      const { shop_id, user_id, amount, type, description, transaction_id } = req.body;

      if (!shop_id || !user_id || !amount || !description) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { required: ['shop_id', 'user_id', 'amount', 'description'] }, 'shop_id, user_id, amount, and description are required');
      }

      const shopId = parseId(String(shop_id), 'shop id');
      const userId = parseId(String(user_id), 'user id');
      const parsedAmount = Number(amount);

      if (!parsedAmount || parsedAmount <= 0) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'amount' }, 'Valid amount is required');
      }

      const expense = await createExpense({
        shop_id: shopId,
        user_id: userId,
        amount: parsedAmount,
        type: type || 'expense',
        description,
        transaction_id: transaction_id || null
      });

      return success(res, expense, { message: 'Expense created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:create failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to create expense';
      return failureCode(res, 500, ErrorCodes.CREATE_EXPENSE_FAILED, { error: message });
    }
  }

  async getExpenses(req: Request, res: Response) {
    try {
      const { shop_id, user_id, status, from_date, to_date, page, limit } = req.query;

      if (!shop_id || typeof shop_id !== 'string') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'shop_id' }, 'shop_id is required');
      }

      const shopId = parseId(shop_id, 'shop id');
      const result = await getExpenses({
        shop_id: String(shopId),
        user_id: user_id as string,
        status: status as string,
        from_date: from_date as string,
        to_date: to_date as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      return success(res, result.expenses, {
        message: 'Expenses retrieved',
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          count: result.expenses.length
        }
      });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:list failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to fetch expenses';
      return failureCode(res, 500, ErrorCodes.GET_EXPENSES_FAILED, { error: message });
    }
  }

  async getExpenseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const expenseId = parseId(id, 'expense id');

      const expense = await Expense.findByPk(expenseId);
      if (!expense) {
        return failureCode(res, 404, ErrorCodes.EXPENSE_NOT_FOUND, { id: expenseId }, 'Expense not found');
      }

      return success(res, expense, { message: 'Expense retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:get failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to fetch expense';
      return failureCode(res, 500, ErrorCodes.GET_EXPENSE_FAILED, { error: message });
    }
  }

  async updateExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const expenseId = parseId(id, 'expense id');
      const updates = req.body;

      const expense = await Expense.findByPk(expenseId);
      if (!expense) {
        return failureCode(res, 404, ErrorCodes.EXPENSE_NOT_FOUND, { id: expenseId }, 'Expense not found');
      }

      await expense.update(updates);
      return success(res, expense, { message: 'Expense updated successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:update failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to update expense';
      return failureCode(res, 500, ErrorCodes.UPDATE_EXPENSE_FAILED, { error: message });
    }
  }

  async deleteExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const expenseId = parseId(id, 'expense id');

      const expense = await Expense.findByPk(expenseId);
      if (!expense) {
        return failureCode(res, 404, ErrorCodes.EXPENSE_NOT_FOUND, { id: expenseId }, 'Expense not found');
      }

      await expense.destroy();
      return success(res, null, { message: 'Expense deleted successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:delete failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to delete expense';
      return failureCode(res, 500, ErrorCodes.DELETE_EXPENSE_FAILED, { error: message });
    }
  }

  async getExpenseSummary(req: Request, res: Response) {
    try {
      const { shop_id } = req.query;

      if (!shop_id || typeof shop_id !== 'string') {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'shop_id' }, 'shop_id is required');
      }

      const shopId = parseId(shop_id, 'shop id');
      const summary = await getExpenseSummary(String(shopId));

      return success(res, summary, { message: 'Expense summary retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:summary failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to fetch expense summary';
      return failureCode(res, 500, ErrorCodes.GET_EXPENSE_SUMMARY_FAILED, { error: message });
    }
  }

  async getExpenseAllocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const expenseId = parseId(id, 'expense id');

      req.log?.info({ expenseId }, 'expense:getExpenseAllocation');

      // Dynamically import to avoid circular dependencies
      const { default: settlementTrackingService } = await import('../services/settlementTrackingService');

      const allocationDetail = await settlementTrackingService.getExpenseAllocationDetail(expenseId);

      return success(res, allocationDetail, { message: 'Expense allocation retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'expense:getExpenseAllocation failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to fetch expense allocation';
      return failureCode(res, 500, ErrorCodes.GET_EXPENSE_ALLOCATION_FAILED, { error: message });
    }
  }
}