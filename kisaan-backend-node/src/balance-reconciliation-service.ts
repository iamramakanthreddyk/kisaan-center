/**
 * Balance Reconciliation Service
 * Ensures data integrity and proper bookkeeping across the system
 */

import { User } from './models/user';
import { Transaction } from './models/transaction';
import { Payment } from './models/payment';
import { TransactionLedger } from './models/transactionLedger';
import BalanceSnapshot from './models/balanceSnapshot';
import { PaymentAllocation } from './models/paymentAllocation';
import { AuditLog } from './models/auditLog';

export class BalanceReconciliationService {

  /**
   * Reconcile user balance with transaction ledger
   * Ensures user.balance matches sum of ledger entries
   */
  async reconcileUserBalance(userId: number): Promise<{
    userId: number;
    currentBalance: number;
    ledgerBalance: number;
    discrepancy: number;
    isReconciled: boolean;
  }> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const currentBalance = Number(user.balance || 0);

    // Calculate balance from ledger entries
    const ledgerEntries = await TransactionLedger.findAll({
      where: { user_id: userId },
      attributes: ['delta_amount']
    });

    const ledgerBalance = ledgerEntries.reduce((sum: number, entry: { delta_amount?: number | string }) => 
      sum + Number(entry.delta_amount || 0), 0
    );

    const discrepancy = Math.abs(currentBalance - ledgerBalance);
    const isReconciled = discrepancy < 0.01; // Allow 1 cent tolerance for rounding

    return {
      userId,
      currentBalance,
      ledgerBalance, 
      discrepancy,
      isReconciled
    };
  }

  /**
   * Reconcile payment allocation totals
   * Ensures payments are properly allocated to transactions
   */
  async reconcilePaymentAllocations(paymentId: number): Promise<{
    paymentId: number;
    paymentAmount: number;
    allocatedAmount: number;
    unallocatedAmount: number;
    isFullyAllocated: boolean;
  }> {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    const paymentAmount = Number(payment.amount || 0);

    const allocations = await PaymentAllocation.findAll({
      where: { payment_id: paymentId }
    });

    const allocatedAmount = allocations.reduce((sum: number, alloc: { allocated_amount?: number | string }) => 
      sum + Number(alloc.allocated_amount || 0), 0
    );

    const unallocatedAmount = paymentAmount - allocatedAmount;
    const isFullyAllocated = Math.abs(unallocatedAmount) < 0.01;

    return {
      paymentId,
      paymentAmount,
      allocatedAmount,
      unallocatedAmount,
      isFullyAllocated
    };
  }

  /**
   * Reconcile transaction payment status
   * Ensures transaction payment status matches actual payments received
   */
  async reconcileTransactionPayments(transactionId: number): Promise<{
    transactionId: number;
    totalAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    calculatedStatus: string;
    currentStatus: string;
    statusMatches: boolean;
  }> {
    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) throw new Error(`Transaction ${transactionId} not found`);

    const totalAmount = Number((transaction as { total_amount?: number | string }).total_amount || 0);

    // Calculate total payments allocated to this transaction
    const allocations = await PaymentAllocation.findAll({
      where: { transaction_id: transactionId },
      include: [{
        model: Payment,
        where: { status: 'PAID' }
      }]
    });

    const totalPaid = allocations.reduce((sum: number, alloc: { allocated_amount?: number | string }) => 
      sum + Number(alloc.allocated_amount || 0), 0
    );

    const outstandingAmount = totalAmount - totalPaid;

    // Calculate what status should be
    let calculatedStatus = 'pending';
    if (Math.abs(outstandingAmount) < 0.01) {
      calculatedStatus = 'paid';
    } else if (totalPaid > 0) {
      calculatedStatus = 'partial';
    }

    const currentStatus = (transaction as { payment_status?: string }).payment_status || 'pending';
    const statusMatches = calculatedStatus === currentStatus;

    return {
      transactionId,
      totalAmount,
      totalPaid,
      outstandingAmount,
      calculatedStatus,
      currentStatus,
      statusMatches
    };
  }

  /**
   * Comprehensive balance audit for a shop
   * Checks all balances, payments, and ledger entries for consistency
   */
  async auditShopBalances(shopId: number): Promise<{
    shopId: number;
    userReconciliations: Array<{
      userId: number;
      currentBalance: number;
      ledgerBalance: number;
      discrepancy: number;
      isReconciled: boolean;
    }>;
    paymentReconciliations: Array<{
      paymentId: number;
      paymentAmount: number;
      allocatedAmount: number;
      unallocatedAmount: number;
      isFullyAllocated: boolean;
    }>;
    transactionReconciliations: Array<{
      transactionId: number;
      totalAmount: number;
      totalPaid: number;
      outstandingAmount: number;
      calculatedStatus: string;
      currentStatus: string;
      statusMatches: boolean;
    }>;
    totalDiscrepancies: number;
    overallHealthy: boolean;
    recommendations: string[];
  }> {
    // Get all users associated with this shop
    const users = await User.findAll({
      where: { shop_id: shopId }
    });

    // Get all payments for this shop
    const payments = await Payment.findAll({
      where: { shop_id: shopId }
    });

    // Get all transactions for this shop
    const transactions = await Transaction.findAll({
      where: { shop_id: shopId }
    });

    // Reconcile each user's balance
    const userReconciliations = [];
    for (const user of users) {
      const reconciliation = await this.reconcileUserBalance(user.id);
      userReconciliations.push(reconciliation);
    }

    // Reconcile each payment allocation
    const paymentReconciliations = [];
    for (const payment of payments) {
      const reconciliation = await this.reconcilePaymentAllocations(payment.id);
      paymentReconciliations.push(reconciliation);
    }

    // Reconcile each transaction payment status
    const transactionReconciliations = [];
    for (const transaction of transactions) {
      const reconciliation = await this.reconcileTransactionPayments(transaction.id);
      transactionReconciliations.push(reconciliation);
    }

    // Calculate total discrepancies
    const totalDiscrepancies = userReconciliations.reduce((sum, r) => sum + r.discrepancy, 0);

    // Determine overall health
    const unreconciled = userReconciliations.filter(r => !r.isReconciled).length;
    const unallocated = paymentReconciliations.filter(r => !r.isFullyAllocated).length;
    const statusMismatches = transactionReconciliations.filter(r => !r.statusMatches).length;

    const overallHealthy = unreconciled === 0 && unallocated === 0 && statusMismatches === 0;

    // Generate recommendations
    const recommendations = [];
    if (unreconciled > 0) {
      recommendations.push(`${unreconciled} user balance(s) need reconciliation`);
    }
    if (unallocated > 0) {
      recommendations.push(`${unallocated} payment(s) have allocation discrepancies`);
    }
    if (statusMismatches > 0) {
      recommendations.push(`${statusMismatches} transaction(s) have incorrect payment status`);
    }
    if (totalDiscrepancies > 1) {
      recommendations.push(`Total balance discrepancy: ${totalDiscrepancies.toFixed(2)}`);
    }

    return {
      shopId,
      userReconciliations,
      paymentReconciliations,
      transactionReconciliations,
      totalDiscrepancies,
      overallHealthy,
      recommendations
    };
  }

  /**
   * Fix user balance discrepancy by updating to match ledger
   */
  async fixUserBalanceDiscrepancy(userId: number): Promise<boolean> {
    const reconciliation = await this.reconcileUserBalance(userId);
    
    if (reconciliation.isReconciled) {
      return true; // Already reconciled
    }

    // Update user balance to match ledger
    await User.update(
      { balance: reconciliation.ledgerBalance },
      { where: { id: userId } }
    );

    // Create balance snapshot for audit trail
    await BalanceSnapshot.create({
      user_id: userId,
      balance_type: 'farmer', // Would need logic to determine farmer vs buyer
      previous_balance: reconciliation.currentBalance,
      amount_change: reconciliation.ledgerBalance - reconciliation.currentBalance,
      new_balance: reconciliation.ledgerBalance,
      transaction_type: 'reconciliation',
      description: `Balance reconciliation: corrected discrepancy of ${reconciliation.discrepancy}`
    });

    return true;
  }

  /**
   * Generate comprehensive balance report
   */
  async generateBalanceReport(shopId: number): Promise<{
    shopId: number;
    timestamp: Date;
    summary: {
      totalUsers: number;
      totalPayments: number;
      totalTransactions: number;
      totalDiscrepancies: number;
      isHealthy: boolean;
    };
    details: {
      shopId: number;
      userReconciliations: Array<{
        userId: number;
        currentBalance: number;
        ledgerBalance: number;
        discrepancy: number;
        isReconciled: boolean;
      }>;
      paymentReconciliations: Array<{
        paymentId: number;
        paymentAmount: number;
        allocatedAmount: number;
        unallocatedAmount: number;
        isFullyAllocated: boolean;
      }>;
      transactionReconciliations: Array<{
        transactionId: number;
        totalAmount: number;
        totalPaid: number;
        outstandingAmount: number;
        calculatedStatus: string;
        currentStatus: string;
        statusMatches: boolean;
      }>;
      totalDiscrepancies: number;
      overallHealthy: boolean;
      recommendations: string[];
    };
    actionItems: string[];
  }> {
    const audit = await this.auditShopBalances(shopId);
    
    const report = {
      shopId,
      timestamp: new Date(),
      summary: {
        totalUsers: audit.userReconciliations.length,
        totalPayments: audit.paymentReconciliations.length,
        totalTransactions: audit.transactionReconciliations.length,
        totalDiscrepancies: audit.totalDiscrepancies,
        isHealthy: audit.overallHealthy
      },
      details: audit,
      actionItems: audit.recommendations
    };

    // Log the report
    await AuditLog.create({
      shop_id: shopId,
      user_id: 1, // System user
      action: 'balance_reconciliation_report',
      entity_type: 'shop',
      entity_id: shopId,
      new_values: JSON.stringify(report)
    });

    return report;
  }
}

export const balanceReconciliationService = new BalanceReconciliationService();