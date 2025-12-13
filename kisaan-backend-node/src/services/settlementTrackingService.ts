import sequelize from '../config/database';
import { Transaction } from '../models/transaction';
import { Payment } from '../models/payment';
import { Expense } from '../models/expense';
import TransactionSettlement from '../models/transactionSettlement';
import ExpenseAllocation from '../models/expenseAllocation';

/**
 * Settlement Tracking Service
 * 
 * Handles payment/expense settlement tracking for transactions.
 * Provides methods for:
 * - Recording payment settlements
 * - Offsetting expenses against transactions
 * - Querying settlement details
 * - Querying allocation details
 * 
 * All settlement operations create audit trail records in:
 * - kisaan_transaction_settlements (how transactions are settled)
 * - kisaan_expense_allocations (how expenses are allocated)
 * - kisaan_transaction_ledger (financial ledger entries)
 * 
 * Database triggers automatically update:
 * - transaction.settled_amount, pending_amount, settlement_status
 * - expense.allocated_amount, remaining_amount, allocation_status
 */

interface TransactionSettlementDetail {
  transaction_id: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
  settlement_status: string;
  settled_via_payments: number;
  payment_count: number;
  settled_via_expenses: number;
  expense_offset_count: number;
  settled_via_credits: number;
  credit_offset_count: number;
  settled_via_adjustments: number;
}

interface ExpenseAllocationDetail {
  expense_id: number;
  total_amount: number;
  allocated_amount: number;
  remaining_amount: number;
  allocation_status: string;
  allocated_to_transactions: number;
  transaction_offset_count: number;
  allocated_to_balance: number;
  balance_settlement_count: number;
  allocated_as_advance: number;
}

interface UserFinancialPicture {
  user_id: number;
  current_balance: number;
  pending_transaction_amounts: number;
  unallocated_expense_amounts: number;
  total_payments: number;
  total_expenses: number;
  net_position: number;
}
export class SettlementTrackingService {
  
  /**
   * Record a payment against a transaction and create settlement record
   * 
   * This method creates a settlement record linking a payment to a transaction.
   * The database trigger will automatically update the transaction's settlement status.
   * 
   * @param data - Payment settlement data
   * @returns Settlement record and updated transaction
   */
  async recordPaymentSettlement(data: {
    transaction_id: number;
    payment_id: number;
    amount: number;
    created_by: number;
    notes?: string;
  }): Promise<{ settlement: TransactionSettlement; transaction: Transaction }> {
    const t = await sequelize.transaction();
    
    try {
      console.log('[SettlementService] Recording payment settlement:', data);
      
      // Create settlement record
      const settlement = await TransactionSettlement.create({
        transaction_id: data.transaction_id,
        settlement_type: 'PAYMENT',
        payment_id: data.payment_id,
        amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        settled_date: new Date()
      }, { transaction: t });

      console.log('[SettlementService] Settlement record created:', settlement.id);

      // TODO: Create ledger entry once TransactionLedger model is updated with reference fields
      // For now, settlement records provide the audit trail

      await t.commit();

      // Trigger will auto-update transaction.settled_amount, pending_amount, settlement_status
      // Reload transaction to get updated values
      const transaction = await Transaction.findByPk(data.transaction_id);
      
      if (!transaction) {
        throw new Error(`Transaction ${data.transaction_id} not found after settlement`);
      }

      console.log('[SettlementService] Transaction reloaded with updated status:', {
        settled_amount: transaction.settled_amount,
        pending_amount: transaction.pending_amount,
        settlement_status: transaction.settlement_status
      });
      
      return { settlement, transaction };
    } catch (error) {
      console.error('[SettlementService] Error recording payment settlement:', error);
      await t.rollback();
      throw error;
    }
  }

  /**
   * Offset an expense against a transaction (expense offset settlement)
   * 
   * This method creates both:
   * 1. ExpenseAllocation record (expense side)
   * 2. TransactionSettlement record (transaction side)
   * 
   * Database triggers will automatically update both:
   * - expense.allocated_amount, remaining_amount, allocation_status
   * - transaction.settled_amount, pending_amount, settlement_status
   * 
   * @param data - Expense offset data
   * @returns Allocation, settlement, updated expense, and updated transaction
   */
  async offsetExpenseAgainstTransaction(data: {
    transaction_id: number;
    expense_id: number;
    amount: number;
    created_by: number;
    notes?: string;
  }): Promise<{ 
    allocation: ExpenseAllocation; 
    settlement: TransactionSettlement; 
    expense: Expense; 
    transaction: Transaction 
  }> {
    const t = await sequelize.transaction();
    
    try {
      console.log('[SettlementService] Offsetting expense against transaction:', data);

      // Verify expense and transaction exist
      const expense = await Expense.findByPk(data.expense_id, { transaction: t });
      const transaction = await Transaction.findByPk(data.transaction_id, { transaction: t });

      if (!expense) {
        throw new Error(`Expense ${data.expense_id} not found`);
      }
      if (!transaction) {
        throw new Error(`Transaction ${data.transaction_id} not found`);
      }

      // Verify amount doesn't exceed expense remaining or transaction pending
      const expenseRemaining = expense.remaining_amount || expense.amount;
      const transactionPending = transaction.pending_amount || transaction.total_amount;

      if (data.amount > expenseRemaining) {
        throw new Error(`Amount ${data.amount} exceeds expense remaining amount ${expenseRemaining}`);
      }
      if (data.amount > transactionPending) {
        throw new Error(`Amount ${data.amount} exceeds transaction pending amount ${transactionPending}`);
      }
      
      // Create expense allocation record
      const allocation = await ExpenseAllocation.create({
        expense_id: data.expense_id,
        allocation_type: 'TRANSACTION_OFFSET',
        transaction_id: data.transaction_id,
        allocated_amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        allocation_date: new Date()
      }, { transaction: t });

      console.log('[SettlementService] Allocation record created:', allocation.id);

      // Create settlement record
      const settlement = await TransactionSettlement.create({
        transaction_id: data.transaction_id,
        settlement_type: 'EXPENSE_OFFSET',
        expense_id: data.expense_id,
        amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        settled_date: new Date()
      }, { transaction: t });

      console.log('[SettlementService] Settlement record created:', settlement.id);

      // Update allocation with settlement link for complete chain
      await allocation.update({
        transaction_settlement_id: settlement.id
      }, { transaction: t });

      console.log('[SettlementService] Allocation linked to settlement');

      // TODO: Create ledger entry once TransactionLedger model is updated with reference fields
      // For now, settlement and allocation records provide the audit trail

      await t.commit();

      // Triggers will auto-update:
      // - expense.allocated_amount, remaining_amount, allocation_status
      // - transaction.settled_amount, pending_amount, settlement_status
      
      // Reload both to get updated values
      const updatedExpense = await Expense.findByPk(data.expense_id);
      const updatedTransaction = await Transaction.findByPk(data.transaction_id);
      
      if (!updatedExpense || !updatedTransaction) {
        throw new Error('Failed to reload expense or transaction after offset');
      }

      console.log('[SettlementService] Records reloaded with updated statuses:', {
        expense: {
          allocated_amount: updatedExpense.allocated_amount,
          remaining_amount: updatedExpense.remaining_amount,
          allocation_status: updatedExpense.allocation_status
        },
        transaction: {
          settled_amount: updatedTransaction.settled_amount,
          pending_amount: updatedTransaction.pending_amount,
          settlement_status: updatedTransaction.settlement_status
        }
      });
      
      return { 
        allocation, 
        settlement, 
        expense: updatedExpense, 
        transaction: updatedTransaction 
      };
    } catch (error) {
      console.error('[SettlementService] Error offsetting expense:', error);
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get transaction settlement breakdown from view
   * 
   * Returns detailed settlement information including:
   * - Total, settled, and pending amounts
   * - Settlement status
   * - Breakdown by settlement type (payments, expenses, credits)
   * - Count of each settlement type
   * 
   * @param transaction_id - Transaction ID
   * @returns Settlement detail object
   */
  async getTransactionSettlementDetail(transaction_id: number): Promise<TransactionSettlementDetail | null> {
    console.log('[SettlementService] Getting settlement detail for transaction:', transaction_id);
    
    const [results] = await sequelize.query(`
      SELECT * FROM v_transaction_settlement_detail 
      WHERE transaction_id = :transaction_id
    `, {
      replacements: { transaction_id },
      type: 'SELECT'
    });

    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.log('[SettlementService] No settlement detail found, returning empty structure');
      
      // Return transaction with empty settlement if no detail found
      const transaction = await Transaction.findByPk(transaction_id);
      if (!transaction) {
        throw new Error(`Transaction ${transaction_id} not found`);
      }

      return {
        transaction_id,
        total_amount: transaction.total_amount,
        settled_amount: transaction.settled_amount || 0,
        pending_amount: transaction.pending_amount || transaction.total_amount,
        settlement_status: transaction.settlement_status || 'UNSETTLED',
        settled_via_payments: 0,
        payment_count: 0,
        settled_via_expenses: 0,
        expense_offset_count: 0,
        settled_via_credits: 0,
        credit_offset_count: 0,
        settled_via_adjustments: 0
      };
    }

    console.log('[SettlementService] Settlement detail found:', results);
    return results as unknown as TransactionSettlementDetail;
  }

  /**
   * Get expense allocation breakdown from view
   * 
   * Returns detailed allocation information including:
   * - Total, allocated, and remaining amounts
   * - Allocation status
   * - Breakdown by allocation type (transaction offsets, balance settlements, advances)
   * - Count of each allocation type
   * 
   * @param expense_id - Expense ID
   * @returns Allocation detail object
   */
  async getExpenseAllocationDetail(expense_id: number): Promise<ExpenseAllocationDetail | null> {
    console.log('[SettlementService] Getting allocation detail for expense:', expense_id);
    
    const [results] = await sequelize.query(`
      SELECT * FROM v_expense_allocation_detail 
      WHERE expense_id = :expense_id
    `, {
      replacements: { expense_id },
      type: 'SELECT'
    });

    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.log('[SettlementService] No allocation detail found, returning empty structure');
      
      // Return expense with empty allocation if no detail found
      const expense = await Expense.findByPk(expense_id);
      if (!expense) {
        throw new Error(`Expense ${expense_id} not found`);
      }

      return {
        expense_id,
        total_amount: expense.total_amount || expense.amount,
        allocated_amount: expense.allocated_amount || 0,
        remaining_amount: expense.remaining_amount || expense.amount,
        allocation_status: expense.allocation_status || 'UNALLOCATED',
        allocated_to_transactions: 0,
        transaction_offset_count: 0,
        allocated_to_balance: 0,
        balance_settlement_count: 0,
        allocated_as_advance: 0
      };
    }

    console.log('[SettlementService] Allocation detail found:', results);
    return results as unknown as ExpenseAllocationDetail;
  }

  /**
   * Get user financial picture using PostgreSQL function
   * 
   * Returns comprehensive financial snapshot including:
   * - Current balance
   * - Pending transaction amounts
   * - Unallocated expense amounts
   * - Total payments and expenses
   * - Net financial position
   * 
   * @param user_id - User ID
   * @returns Financial picture object
   */
  async getUserFinancialPicture(user_id: number): Promise<UserFinancialPicture | null> {
    console.log('[SettlementService] Getting financial picture for user:', user_id);
    
    const [results] = await sequelize.query(`
      SELECT * FROM get_user_financial_picture(:user_id)
    `, {
      replacements: { user_id },
      type: 'SELECT'
    });

    if (!results || (Array.isArray(results) && results.length === 0)) {
      console.log('[SettlementService] No financial picture found for user');
      return null;
    }

    console.log('[SettlementService] Financial picture:', results[0]);
    return results[0] as unknown as UserFinancialPicture;
  }

  /**
   * Get all settlement records for a transaction
   * 
   * @param transaction_id - Transaction ID
   * @returns Array of settlement records with related entities
   */
  async getTransactionSettlements(transaction_id: number): Promise<TransactionSettlement[]> {
    console.log('[SettlementService] Getting all settlements for transaction:', transaction_id);
    
    const settlements = await TransactionSettlement.findAll({
      where: { transaction_id },
      include: [
        { 
          model: Payment, 
          as: 'payment', 
          required: false,
          attributes: ['id', 'amount', 'method', 'payment_date', 'status']
        },
        { 
          model: Expense, 
          as: 'expense', 
          required: false,
          attributes: ['id', 'amount', 'type', 'description', 'status']
        }
      ],
      order: [['settled_date', 'DESC']]
    });

    console.log('[SettlementService] Found', settlements.length, 'settlement records');
    return settlements;
  }

  /**
   * Get all allocation records for an expense
   * 
   * @param expense_id - Expense ID
   * @returns Array of allocation records with related entities
   */
  async getExpenseAllocations(expense_id: number): Promise<ExpenseAllocation[]> {
    console.log('[SettlementService] Getting all allocations for expense:', expense_id);
    
    const allocations = await ExpenseAllocation.findAll({
      where: { expense_id },
      include: [
        { 
          model: Transaction, 
          as: 'transaction', 
          required: false,
          attributes: ['id', 'total_amount', 'settled_amount', 'pending_amount', 'settlement_status']
        }
      ],
      order: [['allocation_date', 'DESC']]
    });

    console.log('[SettlementService] Found', allocations.length, 'allocation records');
    return allocations;
  }
}

export default new SettlementTrackingService();
