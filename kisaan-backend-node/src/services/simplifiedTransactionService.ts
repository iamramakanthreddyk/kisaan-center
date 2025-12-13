import { User } from '../models/user';
import { Transaction, TransactionStatus } from '../models/transaction';
import { Settlement, SettlementStatus, SettlementReason } from '../models/settlement';
import { Payment, PaymentParty, PaymentMethod, PaymentStatus } from '../models/payment';
// import sequelize from '../config/database';
import { TRANSACTION_STATUS as _TRANSACTION_STATUS } from '../shared/constants/index';

/**
 * SIMPLIFIED TRANSACTION & BALANCE SERVICE
 * 
 * Clear user story:
 * 1. Transaction creates -> farmer gets positive balance (shop owes farmer)
 *                        -> buyer gets negative balance (buyer owes shop)
 * 2. Payments reduce user balances toward zero
 * 3. Expenses/advances affect user balances clearly
 */

export class SimplifiedTransactionService {
  
  /**
   * Create transaction with simple balance logic
   */
  async createSimpleTransaction(data: {
    shop_id: number;
    farmer_id: number;
    buyer_id: number;
    category_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    commission_rate?: number;
    transaction_date?: Date;
    notes?: string;
    payments?: Array<{
      payer_type: 'BUYER' | 'SHOP';
      payee_type: 'SHOP' | 'FARMER';
      amount: number;
      method: string;
      status?: string;
      payment_date?: string;
      notes?: string;
    }>;
  }): Promise<{ transaction: Transaction; payments: Payment[]; balance_updates: { farmer: { old_balance: number; new_balance: number } } }> {
    
    // Calculate amounts
    const total_amount = data.quantity * data.unit_price;
    const commission_rate = data.commission_rate || 5; // Default 5%
    const commission_amount = (total_amount * commission_rate) / 100;
    const farmer_earning = total_amount - commission_amount;
    
    // Create transaction record
    const transaction = await Transaction.create({
      shop_id: data.shop_id,
      farmer_id: data.farmer_id,
      buyer_id: data.buyer_id,
      category_id: data.category_id,
      product_name: data.product_name,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_sale_value: total_amount,
      shop_commission: commission_amount,
      farmer_earning,
      commission_rate,
      status: TransactionStatus.Pending,
      transaction_date: data.transaction_date || new Date()
    });
    
    // SIMPLIFIED BALANCE UPDATE
    // Farmer: +farmer_earning (shop owes farmer this amount)
    await this.updateBalance(data.farmer_id, farmer_earning, 'add');
    
    // Buyer: -total_amount (buyer owes shop this amount) 
    await this.updateBalance(data.buyer_id, total_amount, 'subtract');
    
    // Create payments if provided
  const createdPayments: Payment[] = [];
    if (data.payments && Array.isArray(data.payments)) {
      for (const payment of data.payments) {
        // Normalize payer_type and payee_type (handle both uppercase and lowercase)
        const payerType = payment.payer_type.toLowerCase();
        const payeeType = payment.payee_type.toLowerCase();
        
        // Map to enum values
        let payer: PaymentParty;
        if (payerType === 'buyer') payer = PaymentParty.Buyer;
        else if (payerType === 'shop') payer = PaymentParty.Shop;
        else if (payerType === 'farmer') payer = PaymentParty.Farmer;
        else throw new Error(`Invalid payer_type: ${payerType}`);
        
        let payee: PaymentParty;
        if (payeeType === 'shop') payee = PaymentParty.Shop;
        else if (payeeType === 'farmer') payee = PaymentParty.Farmer;
        else if (payeeType === 'buyer') payee = PaymentParty.Buyer;
        else throw new Error(`Invalid payee_type: ${payeeType}`);
        
        const paymentRecord = await Payment.create({
          transaction_id: transaction.id,
          payer_type: payer,
          payee_type: payee,
          amount: payment.amount,
          method: (payment.method === 'cash' ? PaymentMethod.Cash : payment.method === 'bank_transfer' ? PaymentMethod.BankTransfer : payment.method === 'upi' ? PaymentMethod.Upi : PaymentMethod.Other),
          status: (payment.status === 'COMPLETED' ? PaymentStatus.Paid : payment.status === 'PENDING' ? PaymentStatus.Pending : PaymentStatus.Failed),
          payment_date: payment.payment_date ? new Date(payment.payment_date) : new Date(),
          notes: payment.notes || '',
          counterparty_id: payerType === 'buyer' ? data.buyer_id : data.farmer_id
        });
        createdPayments.push(paymentRecord);
      }
    }
    
    return {
      transaction,
      payments: createdPayments,
      balance_updates: {
        farmer: { old_balance: 0, new_balance: farmer_earning } // Simplified for now
      }
    };
  }
  
  /**
   * Record payment - reduces user balance toward zero
   */
  async recordPayment(data: {
    user_id: number;
    amount: number;
    payment_type: 'farmer_payment' | 'buyer_payment';
    notes?: string;
  }): Promise<Payment> {
    
    // Create payment record
    const payment = await Payment.create({
      transaction_id: null, // Not tied to specific transaction
  payer_type: data.payment_type === 'buyer_payment' ? PaymentParty.Buyer : PaymentParty.Shop,
  payee_type: data.payment_type === 'buyer_payment' ? PaymentParty.Shop : PaymentParty.Farmer,
  amount: data.amount,
  status: PaymentStatus.Paid,
  method: PaymentMethod.Cash,
      notes: data.notes || '',
      counterparty_id: data.user_id
    });
    
    // Update balance based on payment type
    if (data.payment_type === 'farmer_payment') {
      // Shop pays farmer -> reduces farmer's positive balance
      await this.updateBalance(data.user_id, data.amount, 'subtract');
    } else {
      // Buyer pays shop -> reduces buyer's negative balance (brings toward 0)
      await this.updateBalance(data.user_id, data.amount, 'add');
    }
    
    return payment;
  }
  
  /**
   * Record expense/advance - affects user balance
   */
  async recordExpense(data: {
    user_id: number;
    amount: number;
    expense_type: 'shop_expense' | 'user_advance';
    description: string;
    shop_id: number;
  }): Promise<Settlement> {
    
    if (data.expense_type === 'shop_expense') {
      // Shop business expense - doesn't affect user balances
      // Just track for shop accounting
      return await Settlement.create({
        shop_id: data.shop_id,
        user_id: data.user_id, // Owner's ID
        amount: data.amount,
  reason: SettlementReason.Adjustment,
  status: SettlementStatus.Settled // Shop expenses are immediately settled
      });
      
    } else {
      // User advance - reduces user's balance (they owe less or shop owes less)
      await this.updateBalance(data.user_id, data.amount, 'subtract');
      
      return await Settlement.create({
        shop_id: data.shop_id,
        user_id: data.user_id,
        amount: data.amount,
        reason: SettlementReason.Adjustment,
        status: SettlementStatus.Settled
      });
    }
  }
  
  /**
   * Simple balance update helper
   */
  private async updateBalance(userId: number, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const currentBalance = parseFloat(user.balance?.toString() || '0');
    const newBalance = operation === 'add'
      ? currentBalance + amount
      : currentBalance - amount;

    await user.update({ balance: newBalance });

    // Create balance snapshot for expense/advance
    const balanceChange = newBalance - currentBalance;
    if (balanceChange !== 0) {
      try {
        const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
        await BalanceSnapshot.create({
          user_id: userId,
          balance_type: 'farmer', // Assuming expenses are for farmers, but could be buyer too
          previous_balance: currentBalance,
          amount_change: balanceChange,
          new_balance: newBalance,
          transaction_type: 'expense',
          reference_type: 'expense',
          description: `Expense balance update: ${operation === 'add' ? 'added' : 'deducted'} ${amount}`
        });
      } catch (snapshotError) {
        console.warn(`[BALANCE SNAPSHOT] Failed to create expense snapshot:`, snapshotError);
      }
    }
  }  /**
   * Get user balance with clear explanation
   */
  async getUserBalanceInfo(userId: number): Promise<{
    user_id: number;
    username: string;
    role: string;
    balance: number;
    balance_meaning: string;
  }> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    
    const balance = parseFloat(user.balance?.toString() || '0');
    
    return {
      user_id: userId,
      username: user.username,
      role: user.role,
      balance: balance,
      balance_meaning: balance > 0 
        ? `Shop owes ${user.username} ₹${Math.abs(balance)}`
        : balance < 0 
        ? `${user.username} owes shop ₹${Math.abs(balance)}`
        : `${user.username} has no pending balance`
    };
  }
}