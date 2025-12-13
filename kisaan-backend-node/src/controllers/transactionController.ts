import { Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { ValidationError, AppError } from '../shared/utils/errors';
import { USER_ROLES as _USER_ROLES } from '../shared/constants/index';
import { success, created as createdResp, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { buildPaginationMeta } from '../middleware/pagination';
import { parseId, parseOptionalId } from '../shared/utils/parse';

export class TransactionController {
  /**
   * GET /buyers/:buyerId/purchases - All transactions for a buyer, with optional date filtering and aggregation
   */
  async getPurchasesByBuyer(req: Request, res: Response) {
    try {
      const buyerId = parseId(req.params.buyerId, 'buyer');
      const { startDate, endDate } = req.query;
  const filters: Record<string, unknown> = { buyerId };
      if (startDate && endDate) {
        filters.startDate = new Date(startDate as string);
        filters.endDate = new Date(endDate as string);
      }
  const pagination = req.pagination;
  const transactions = await this.transactionService.getTransactionsByBuyer(buyerId, filters);
  const totalPurchases = transactions.length;
  const totalSpent = transactions.reduce((sum, t) => {
    if (typeof t === 'object' && t !== null && 'total_amount' in t) {
      return sum + Number((t as { total_amount?: unknown }).total_amount || 0);
    }
    return sum;
  }, 0);
  const sliced = pagination ? transactions.slice(pagination.offset, pagination.offset + pagination.limit) : transactions;
  const meta = pagination ? { ...buildPaginationMeta(transactions.length, pagination), totalPurchases, totalSpent } : { totalPurchases, totalSpent };
  return success(res, { totalPurchases, totalSpent, transactions: sliced }, { message: 'Buyer purchases retrieved', meta });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:buyerPurchases failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.BUYER_TXN_LIST_FAILURE, undefined, message || 'Failed to fetch purchases by buyer');
    }
  }
  private transactionService = new TransactionService();

  async createTransaction(req: Request, res: Response) {
    try {
      req.log?.info('transaction:create attempt');
  const user = (req as Request & { user?: { id?: number; role?: string } }).user;
  
  // Debug: Log the raw user object from request
  console.log('[DEBUG] Controller - Raw (req as any).user:', user);
  
  // Authentication is required - no fallback defaults
  if (!user || !user.id || !user.role) {
    return failureCode(res, 401, ErrorCodes.AUTH_TOKEN_REQUIRED, undefined, 'Authentication required to create transactions');
  }
  
  const requestingUser = { 
    id: Number(user.id), 
    role: String(user.role) 
  };
    
  console.log('[DEBUG] Controller - Final requestingUser:', requestingUser);
      
      // Import PaymentService for payment creation
      const { PaymentService } = await import('../services/paymentService');
  const _paymentService = new PaymentService();

  // Extract transaction data (keep payments array if provided)
  const { payments, ...transactionData } = req.body;
      
      const serviceData = {
  shop_id: transactionData.shop_id,
  farmer_id: transactionData.farmer_id,
  buyer_id: transactionData.buyer_id,
  product_id: transactionData.product_id ?? null,
  category_id: transactionData.category_id,
  product_name: transactionData.product_name,
  quantity: transactionData.quantity,
  unit_price: transactionData.unit_price,
  commission_rate: transactionData.commission_rate,
  transaction_date: transactionData.transaction_date,
  notes: transactionData.notes,
  payments: payments
      };

      // Create the transaction
  const transaction = await this.transactionService.createTransaction(serviceData, requestingUser);
  // Return transaction with payments (already attached by service)
  return createdResp(res, transaction, { message: 'Transaction created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction:create failed');
      // If it's a ValidationError or other known AppError, include its context/details in the response to help clients debug
      if (error instanceof ValidationError || error instanceof AppError) {
        // log full error for server-side debugging
        console.error('[transactionController:createTransaction] AppError caught:', error);
        // Build a robust details object that always contains a helpful message and any available context
        const details = {
          message: (error as Error).message,
          ...(error instanceof AppError && error.context ? { context: error.context } : {}),
          payments_count: Array.isArray((req as { body?: { payments?: unknown[] } }).body?.payments) ? ((req as { body?: { payments?: unknown[] } }).body?.payments?.length || 0) : 0
        };
        return failureCode(res, (error as AppError).statusCode || 400, ErrorCodes.TRANSACTION_CREATE_FAILED, details, (error as Error).message);
      }
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.TRANSACTION_CREATE_FAILED, undefined, message || 'Failed to create transaction');
    }
  }

  async getTransactionById(req: Request, res: Response) {
    try {
      const id = parseId(req.params.id, 'transaction');
      const transaction = await this.transactionService.getTransactionById(id);
      if (!transaction) {
  return failureCode(res, 404, ErrorCodes.NOT_FOUND, undefined, 'Transaction not found');
      }
      if (typeof transaction === 'object' && transaction !== null && !('payments' in transaction)) {
        (transaction as Record<string, unknown>).payments = [];
      }
      return success(res, transaction, { message: 'Transaction retrieved successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction:get failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.NOT_FOUND, undefined, message || 'Failed to fetch transaction');
    }
  }

  async confirmCommission(req: Request, res: Response) {
    try {
      const id = parseId(req.params.id, 'transaction');
      // Delegate to service which will set metadata.commission_confirmed = true and recompute status
      const result = await this.transactionService.confirmCommission(id, (req as Request & { user?: { id?: number } }).user?.id ?? 0);
      return success(res, result, { message: 'Commission confirmed and transaction status updated' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction:confirmCommission failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.TRANSACTION_UPDATE_FAILED, undefined, message || 'Failed to confirm commission');
    }
  }

  async getTransactionsByShop(req: Request, res: Response) {
    try {
      const shopId = parseId(req.params.shopId, 'shop');
      // Support both frontend (from_date/to_date) and backend (startDate/endDate) params
      const { startDate, endDate, from_date, to_date, farmerId, buyerId } = req.query;
      const dateStart = from_date || startDate;
      const dateEnd = to_date || endDate;
      // Patch: Robust date parsing for transaction_date filter
      const parseDateFlexible = (dateStr: string | undefined, isStart: boolean): Date | undefined => {
        if (!dateStr) return undefined;
        // Try parsing as YYYY-MM-DD
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          // Try parsing as YYYY-MM-DD HH:mm:ss or similar
          const replaced = dateStr.replace(' ', 'T');
          d = new Date(replaced);
        }
        if (isStart) d.setHours(0, 0, 0, 0);
        else d.setHours(23, 59, 59, 999);
        return d;
      };
      const startDateObj = parseDateFlexible(dateStart as string, true);
      const endDateObj = parseDateFlexible(dateEnd as string, false);
      const filters = {
        startDate: startDateObj,
        endDate: endDateObj,
        farmerId: farmerId ? Number(farmerId) : undefined,
        buyerId: buyerId ? Number(buyerId) : undefined
      };
  const pagination = req.pagination;
  const transactions = await this.transactionService.getTransactionsByShop(shopId, filters);
  const sliced = pagination ? transactions.slice(pagination.offset, pagination.offset + pagination.limit) : transactions;
  const meta = pagination ? { ...buildPaginationMeta(transactions.length, pagination) } : { count: transactions.length };
  return success(res, sliced, { message: 'Shop transactions retrieved', meta });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:byShop failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.FARMER_TXN_LIST_FAILURE, undefined, message || 'Failed to fetch transactions');
    }
  }

  async getShopEarnings(req: Request, res: Response) {
    try {
      const shopId = parseId(req.params.shopId, 'shop');
      const { startDate, endDate } = req.query;
      const period = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      const earnings = await this.transactionService.getShopEarnings(shopId, period);
      return success(res, earnings, { message: 'Shop earnings retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:shopEarnings failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.ANALYTICS_FAILURE, undefined, message || 'Failed to fetch shop earnings');
    }
  }

  async getFarmerEarnings(req: Request, res: Response) {
    try {
      const farmerId = parseId(req.params.farmerId, 'farmer');
      const { shopId, startDate, endDate } = req.query;
      const period = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      const optionalShopId = parseOptionalId(shopId, 'shop');
      const earnings = await this.transactionService.getFarmerEarnings(farmerId, optionalShopId, period);
      return success(res, earnings, { message: 'Farmer earnings retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:farmerEarnings failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.ANALYTICS_FAILURE, undefined, message || 'Failed to fetch farmer earnings');
    }
  }

  /**
   * POST /transactions/backdated - Create a backdated transaction (owner only)
   */
  async createBackdatedTransaction(req: Request, res: Response) {
    try {
      const user = (req as Request & { user?: { id?: number; role?: string; shop_id?: number } }).user;
      
      // Authorization check - only owners can create backdated transactions
      if (!user || user.role !== 'owner') {
        return failureCode(res, 403, ErrorCodes.ACCESS_DENIED, undefined, 'Only owners can create backdated transactions');
      }

      const { transaction_date, ...transactionData } = req.body;

      // Debug: Log the incoming transaction_date from payload
      console.log('[controller:createBackdated] Incoming transaction_date:', transaction_date);

      // Validate transaction date is not in the future
      if (transaction_date && new Date(transaction_date) > new Date()) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, undefined, 'Transaction date cannot be in the future');
      }

      // Create transaction with specified date (pass string, not Date object)
      // Pass requesting user context so service-level authorization checks work
      const requestingUser = { id: Number(user.id), role: String(user.role) };
      const transaction = await this.transactionService.createTransaction({
        ...transactionData,
        transaction_date,
        created_by: user.id,
        shop_id: user.shop_id || transactionData.shop_id
      }, requestingUser);

      req.log?.info({ transactionId: transaction.id, date: transaction_date }, 'backdated transaction created');
      return createdResp(res, transaction, { message: 'Backdated transaction created successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:createBackdated failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.TRANSACTION_CREATE_FAILED, undefined, message || 'Failed to create backdated transaction');
    }
  }

  /**
   * POST /transactions/:id/payments/backdated - Add backdated payments to transaction (owner only)
   */
  async addBackdatedPayments(req: Request, res: Response) {
    try {
      const user = (req as Request & { user?: { id?: number; role?: string } }).user;
      
      // Authorization check - only owners can add backdated payments
      if (!user || user.role !== 'owner') {
        return failureCode(res, 403, ErrorCodes.ACCESS_DENIED, undefined, 'Only owners can add backdated payments');
      }

      const transactionId = parseId(req.params.id, 'transaction');
      const { payments } = req.body;

      if (!payments || !Array.isArray(payments)) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, undefined, 'Payments array is required');
      }

      // Validate payment dates are not in the future
      for (const payment of payments) {
        const paymentDate = new Date(payment.payment_date);
        if (paymentDate > new Date()) {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, undefined, 'Payment date cannot be in the future');
        }
      }

        // Validate user.id is present and a number
        if (typeof user.id !== 'number' || isNaN(user.id)) {
          return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, undefined, 'Authenticated user id is required');
        }
        // Add backdated payments through service
        const result = await this.transactionService.addBackdatedPayments(transactionId, payments, user.id);

      req.log?.info({ transactionId, paymentCount: payments.length }, 'backdated payments added');
      return success(res, result, { message: 'Backdated payments added successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transactions:addBackdatedPayments failed');
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      return failureCode(res, statusCode || 500, ErrorCodes.CREATE_PAYMENT_FAILED, undefined, message || 'Failed to add backdated payments');
    }
  }

  /**
   * GET /transactions/:id/settlement - Get settlement detail for a transaction
   * 
   * Returns comprehensive settlement breakdown including:
   * - Total, settled, and pending amounts
   * - Settlement status
   * - Breakdown by settlement type (payments, expenses, credits)
   */
  async getTransactionSettlement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transactionId = parseId(id, 'transaction id');
      
      const { default: settlementTrackingService } = await import('../services/settlementTrackingService');
      const settlementDetail = await settlementTrackingService.getTransactionSettlementDetail(transactionId);
      
      req.log?.info({ transactionId }, 'transaction settlement retrieved');
      return success(res, settlementDetail, { message: 'Transaction settlement retrieved' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction:settlement:get failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to get settlement';
      return failureCode(res, 500, ErrorCodes.TRANSACTION_SETTLEMENT_GET_FAILED, { error: message }, message);
    }
  }

  /**
   * POST /transactions/:id/offset-expense - Offset an expense against transaction
   * 
   * Body: { expense_id: number, amount: number, notes?: string }
   * 
   * Creates both:
   * - ExpenseAllocation record (expense side)
   * - TransactionSettlement record (transaction side)
   * 
   * Database triggers automatically update:
   * - expense.allocated_amount, remaining_amount, allocation_status
   * - transaction.settled_amount, pending_amount, settlement_status
   */
  async offsetExpenseAgainstTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transactionId = parseId(id, 'transaction id');
      const { expense_id, amount, notes } = req.body;
      
      if (!expense_id || !amount) {
        return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { required: ['expense_id', 'amount'] }, 'expense_id and amount are required');
      }
      
      const user = (req as { user?: { id: number } }).user;
      const userId = user?.id || 1;
      
      const { default: settlementTrackingService } = await import('../services/settlementTrackingService');
      const result = await settlementTrackingService.offsetExpenseAgainstTransaction({
        transaction_id: transactionId,
        expense_id: parseId(String(expense_id), 'expense id'),
        amount: parseFloat(amount),
        created_by: userId,
        notes
      });
      
      req.log?.info({ transactionId, expenseId: expense_id, amount }, 'expense offset against transaction');
      return success(res, result, { message: 'Expense offset against transaction successfully' });
    } catch (error: unknown) {
      req.log?.error({ err: error }, 'transaction:offset-expense failed');
      const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to offset expense';
      return failureCode(res, 500, ErrorCodes.EXPENSE_OFFSET_FAILED, { error: message }, message);
    }
  }
}
