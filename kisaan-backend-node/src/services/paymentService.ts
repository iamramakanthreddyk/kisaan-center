import { User } from '../models/user';
import { Payment, PaymentParty, PaymentMethod, PaymentStatus, PaymentCreationAttributes } from '../models/payment';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { Transaction } from '../models/transaction';
import { PaymentAllocation } from '../models/paymentAllocation';
import ExpenseSettlement from '../models/expenseSettlement';
import { logger } from '../shared/logging/logger';
import { AuditLog } from '../models/auditLog';
import { CreatePaymentDTO, PaymentResponseDTO, UpdatePaymentStatusDTO } from '../dtos';
import { Op } from 'sequelize';
import { PARTY_TYPE } from '../shared/partyTypes';
import { PAYMENT_STATUS } from '../shared/constants/index';
import { BalanceType } from '../shared/enums';
import { ValidationError } from '../shared/utils/errors';
import BalanceSnapshot from '../models/balanceSnapshot';
import { TransactionLedger } from '../models/transactionLedger';
import { applyRepaymentFIFO } from './settlementService';
import * as path from 'path';
import { USER_ROLES } from '../shared/constants/index';
import { LedgerService } from './ledgerService';

// Result shape returned by balance update operations
// appliedToExpenses: amount consumed by expense settlements
// appliedToBalance: amount applied to user's stored balance
// fifoResult: optional detailed FIFO settlement object returned by settlement service
export type BalanceResult = { appliedToExpenses: number; appliedToBalance: number; fifoResult?: unknown };

export class PaymentService {
  private readonly paymentRepository: PaymentRepository;
  private readonly ledgerService: LedgerService;

  

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.ledgerService = new LedgerService();
  }
  async createPayment(data: CreatePaymentDTO, userId: number, options?: { tx?: import('sequelize').Transaction }): Promise<PaymentResponseDTO> {
    // Reject shop-to-shop payments (commission should not be a payment)
    if (data.payer_type === PARTY_TYPE.SHOP && data.payee_type === PARTY_TYPE.SHOP) {
      logger.error({ payload: data }, 'Shop-to-shop payments (commission) are not allowed.');
      throw new Error('Shop-to-shop payments (commission) are not allowed. Do not include commission as a payment.');
    }

    // Map and validate enums, with normalization for common frontend variants
    const normalizeParty = (v: unknown) => (v == null ? '' : String(v).toUpperCase());
    const normalizeStatus = (v: unknown) => (v == null ? '' : String(v).toUpperCase());

    const payerNormalized = normalizeParty(data.payer_type);
    const payeeNormalized = normalizeParty(data.payee_type);
    const mappedPayerType = Object.values(PaymentParty).includes(payerNormalized as PaymentParty)
      ? (payerNormalized as PaymentParty)
      : undefined;
    const mappedPayeeType = Object.values(PaymentParty).includes(payeeNormalized as PaymentParty)
      ? (payeeNormalized as PaymentParty)
      : undefined;

    const mappedMethod = PaymentMethod[String(data.method || '').toUpperCase() as keyof typeof PaymentMethod] || PaymentMethod.Cash;

    // Validate payer/payee/method presence and throw ValidationError with context
    const invalidFields: string[] = [];
    if (!mappedPayerType) invalidFields.push(`payer_type=${String(data.payer_type)}`);
    if (!mappedPayeeType) invalidFields.push(`payee_type=${String(data.payee_type)}`);
    if (!mappedMethod) invalidFields.push(`method=${String(data.method)}`);
    if (invalidFields.length > 0) {
      logger.error({ payload: data }, `Invalid payment fields: ${invalidFields.join(', ')}`);
      throw new ValidationError('Missing or invalid payment fields', { invalidFields, payload: data });
    }

    // Normalize and validate incoming status (accept PAID / COMPLETED aliases)
    let normalizedStatus: PaymentStatus | undefined;
    if (data.status !== undefined && data.status !== null) {
      const statusCand = normalizeStatus(data.status);
      // Accept common synonyms
      if (statusCand === 'PAID' || statusCand === 'COMPLETED') normalizedStatus = PaymentStatus.Paid;
      else if (statusCand === 'PENDING') normalizedStatus = PaymentStatus.Pending;
      else if (statusCand === 'FAILED') normalizedStatus = PaymentStatus.Failed;
      else if (statusCand === 'CANCELLED' || statusCand === 'CANCELED') normalizedStatus = PaymentStatus.Cancelled;
      else normalizedStatus = undefined;
      if (!normalizedStatus) {
        throw new ValidationError('Invalid payment status', { provided: data.status, allowed: ['PAID','COMPLETED','PENDING','FAILED','CANCELLED'] });
      }
    }

    const paymentData: Record<string, unknown> = {
      ...data,
      status: normalizedStatus ?? PaymentStatus.Paid,
      payer_type: mappedPayerType,
      payee_type: mappedPayeeType,
      method: mappedMethod
    };
    // Ensure amount is positive — direction is determined by payer/payee types.
    if (paymentData.amount !== undefined && paymentData.amount !== null) {
      const amt = Number(paymentData.amount);
      paymentData.amount = Math.abs(isNaN(amt) ? 0 : amt);
    }
    // Handle transaction_id: set to null if not provided (for balance payments not tied to transactions)
    if (data.transaction_id !== undefined) {
      paymentData.transaction_id = data.transaction_id;
    } else {
      paymentData.transaction_id = null;
    }

    // Defensive validation for required fields
    const missingFields: string[] = [];
    if (!data.amount) missingFields.push('amount');
    if (!data.payer_type) missingFields.push('payer_type');
    if (!data.payee_type) missingFields.push('payee_type');

    // Set shop_id based on transaction details if not provided
    if (data.transaction_id && !data.shop_id) {
      const transaction = await (await import('../models/transaction')).Transaction.findByPk(data.transaction_id);
      if (transaction) {
        if (!data.shop_id && !paymentData.shop_id) {
          paymentData.shop_id = transaction.shop_id;
          logger.info({ transactionId: data.transaction_id, shopId: transaction.shop_id }, 'Auto-populated shop_id from transaction');
        }
      }
    }
    if (data.payment_date && !paymentData.payment_date) {
      const pd = new Date(data.payment_date as string);
      paymentData.payment_date = isNaN(pd.getTime()) ? data.payment_date : pd;
    }

    // Final required field checks
    if (!paymentData.payment_date) missingFields.push('payment_date');
    if (!paymentData.shop_id) missingFields.push('shop_id');
    if (!paymentData.amount || Number(paymentData.amount) <= 0) missingFields.push('amount');
    if (missingFields.length > 0) {
      logger.warn({ paymentData, missingFields }, 'Missing required fields for payment creation');
      throw new Error(`Missing required fields for payment creation: ${missingFields.join(', ')}`);
    }

    logger.info({ payload: data, normalized: paymentData }, 'Creating payment');    
  const payment = await this.paymentRepository.create(paymentData as PaymentCreationAttributes, options);      
    if (!payment || !payment.id) {
      logger.error({ paymentData }, 'Payment creation failed: No valid payment ID returned');
      throw new Error('Payment creation failed: No valid payment ID returned');   
    }
  logger.info({ payment: payment.toJSON() }, 'Created payment');

    // Allocate payment to outstanding transactions (direct allocations or FIFO)
    // Do this immediately so subsequent balance recalculation sees the allocation records.
    try {
      await this.allocatePaymentToTransactions(payment, options);
    } catch (allocErr) {
      console.warn('[ALLOCATE] Error allocating payment immediately after creation', { paymentId: payment.id, err: (allocErr as Error).message || allocErr });
    }

    // Persist per-payment applied breakdown for transaction-linked payments.
    // When a payment is part of a transaction, allocations are created above.
    // Compute applied_to_expenses and applied_to_balance from allocation records and
    // any expense settlements produced by FIFO, and store them on the payment row
    // so callers (including the transaction flow) can immediately read finalized values.
    try {
      if (payment.transaction_id) {
        const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
        const ExpenseSettlement = (await import('../models/expenseSettlement')).default;

        // Sum allocations for this payment across the transaction
        const allocations = await PaymentAllocation.findAll({ where: { payment_id: payment.id } });
        const totalAllocated = allocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);

        // For transaction-linked payments, any allocations go primarily to the transaction; expense settlements
        // are created by FIFO logic during balance updates. Attempt to derive applied_to_expenses from
        // expenseSettlement rows that reference this payment (if any).
        const settledRows = await ExpenseSettlement.findAll({ where: { payment_id: payment.id } });
        const appliedToExpenses = settledRows.reduce((s: number, r: ExpenseSettlement) => s + Number(r.amount || 0), 0);

        // The remainder of allocated amount (if any) is applied to balance (i.e., reduces unpaid txn amounts)
        const appliedToBalance = Math.max(0, totalAllocated - appliedToExpenses);

        // Persist the computed fields on the payment row. Use update on model to ensure DB persistence.
        try {
          await payment.update({
            applied_to_expenses: appliedToExpenses,
            applied_to_balance: appliedToBalance
          });
        } catch (e) {
          console.warn('[PAYMENT] Failed to persist applied breakdown for payment', payment.id, e);
        }
      }
    } catch (err) {
      console.warn('[PAYMENT] Error while computing/persisting per-payment breakdown', { paymentId: payment.id, err });
    }

    // Post-insert consistency check for NULL payment_date        
    if (!payment.payment_date) {
      logger.error({ payment: payment.toJSON() }, 'Payment created with NULL payment_date');
    }

    // IMPORTANT: Skip balance updates for payments that are part of transaction creation
    // The transaction service's updateUserBalances already accounts for these payments
    // Only update balances for standalone settlement payments (no transaction_id)
  let balanceResult: BalanceResult | undefined;
    if (!payment.transaction_id) {
      // This is a standalone settlement payment - update balances
      // We must compute the actual balance delta AFTER recalculation so the ledger reflects the true change
      logger.info({ paymentId: payment.id }, 'Processing standalone settlement payment - updating balances');

      // SERVER-SIDE GUARD: Prevent unintentional SHOP->FARMER payments that worsen farmer debt
      // Extracted into a small helper for testability
      if (payment.payer_type === PARTY_TYPE.SHOP && payment.payee_type === PARTY_TYPE.FARMER) {
        // Resolve the paymentGuard module from the project root so mocks required
        // in tests (which use the project-relative path) resolve to the same
        // module instance. Fall back to a local require if resolve fails.
        let guardFn: ((opts: { shop_id?: number; counterparty_id?: number; amount?: number; force_override?: boolean }) => Promise<{ worsen: boolean; currentBalance: number; simulatedNewBalance: number }>) | undefined;
        try {
          const abs = path.resolve(process.cwd(), 'src', 'services', 'paymentGuard');
          const guardModule = await import(abs);
          guardFn = typeof guardModule?.willShopToFarmerWorsenDebt === 'function' ? guardModule.willShopToFarmerWorsenDebt : undefined;
        } catch (err) {
          const guardModule = await import('./paymentGuard');
          guardFn = typeof guardModule?.willShopToFarmerWorsenDebt === 'function' ? guardModule.willShopToFarmerWorsenDebt : undefined;
        }
        const guardResult = guardFn
          ? await guardFn({
              shop_id: payment.shop_id || undefined,
              amount: payment.amount as unknown as number,
              force_override: (data as unknown as { force_override?: boolean }).force_override
            })
          : { worsen: false, currentBalance: 0, simulatedNewBalance: 0 };

        if (guardResult.worsen && !(data as unknown as { force_override?: boolean }).force_override) {
          throw new Error(`Payment would worsen farmer debt from ${guardResult.currentBalance} to ${guardResult.simulatedNewBalance}. Use force_override=true to proceed.`);
        }
      }

      // Capture previous balance for ledger delta calculation
      // Note: counterparty_id not available on Payment model, balance updates handled elsewhere
      let previousBalance: number | null = null;

      // Recalculate and apply balances (this may update the user's balance and payment records)
      balanceResult = await this.updateUserBalancesAfterPayment(payment, options);

      // After balances updated, create a ledger entry that records the actual delta
      // Note: counterparty_id not available on Payment model, ledger entries handled elsewhere
    } else {
      // This is part of a transaction - skip balance update
      // The transaction's updateUserBalances method will handle this
      logger.info({ paymentId: payment.id, transactionId: payment.transaction_id }, 'Skipping balance update for transaction payment - handled by transaction service');
      balanceResult = { appliedToExpenses: 0, appliedToBalance: 0 };
    }
    // (Allocation now handled earlier immediately after payment creation)

    // Create audit log
    let shop_id: number | null = null;
    if (data.shop_id) {
      shop_id = data.shop_id;
    } else if (data.transaction_id) {
      const transaction = await Transaction.findByPk(data.transaction_id);
      shop_id = transaction?.shop_id || null;
    }
    await AuditLog.create({
      shop_id: shop_id ?? 1,
      user_id: userId,
      action: 'payment_recorded',
      entity_type: 'payment',
      entity_id: payment.id,
      new_values: JSON.stringify(payment.toJSON())
    });

    // Always recalculate status for the transaction after payment
    if (payment.transaction_id) {
      const { TransactionService } = await import('./transactionService');
      const txnService = new TransactionService();
      console.log('[PAYMENT] Triggering transaction status update', { transactionId: payment.transaction_id });
      await txnService.updateTransactionStatus(payment.transaction_id);
    }

    // Include applied breakdown for client visibility
  const base = payment.toJSON() as unknown as Record<string, unknown>;

    // Helper: format amount as fixed 2-decimal string and cents integer
    const fmtAmount = (v: unknown) => {
      const n = Number(v);
      if (isNaN(n)) return { amount: null, amount_cents: null };
      const amount = (Math.round(n * 100) / 100).toFixed(2);
      return { amount, amount_cents: Math.round(n * 100) };
    };

    // Normalize core id fields to numbers when possible
    const normalizeId = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    };

    const normalizedPayment: Record<string, unknown> = {
      id: normalizeId(base.id),
      transaction_id: base.transaction_id == null ? null : normalizeId(base.transaction_id),
      shop_id: base.shop_id == null ? null : normalizeId(base.shop_id),
      payer_type: typeof base.payer_type === 'string' ? String(base.payer_type).toUpperCase() : base.payer_type,
      payee_type: typeof base.payee_type === 'string' ? String(base.payee_type).toUpperCase() : base.payee_type,
      method: typeof base.method === 'string' ? String(base.method).toUpperCase() : base.method,
      status: typeof base.status === 'string' ? String(base.status).toUpperCase() : base.status,
      notes: base.notes || '',
      payment_date: base.payment_date || null,
      created_at: base.created_at || null,
      updated_at: base.updated_at || null
    };

    // Normalize monetary fields
    const topLevelAmounts = fmtAmount(base.amount);
    normalizedPayment.amount = topLevelAmounts.amount;
    normalizedPayment.amount_cents = topLevelAmounts.amount_cents;

    // Normalize optional balance tracking fields
    if (base.balance_before !== undefined) {
      const bb = Number(base.balance_before);
      normalizedPayment.balance_before = Number.isFinite(bb) ? (Math.round(bb * 100) / 100).toFixed(2) : null;
    } else {
      normalizedPayment.balance_before = null;
    }
    if (base.balance_after !== undefined) {
      const ba = Number(base.balance_after);
      normalizedPayment.balance_after = Number.isFinite(ba) ? (Math.round(ba * 100) / 100).toFixed(2) : null;
    } else {
      normalizedPayment.balance_after = null;
    }

    // Keep allocation/settlement-related fields predictable
    normalizedPayment.settlement_type = base.settlement_type || null;
    normalizedPayment.settled_transactions = Array.isArray(base.settled_transactions) ? base.settled_transactions : [];
    normalizedPayment.settled_expenses = Array.isArray(base.settled_expenses) ? base.settled_expenses : [];
    normalizedPayment.fifo_result = balanceResult?.fifoResult ?? base.fifo_result ?? null;

    normalizedPayment.applied_to_expenses = Number(balanceResult?.appliedToExpenses ?? base.applied_to_expenses ?? 0);
    normalizedPayment.applied_to_balance = Number(balanceResult?.appliedToBalance ?? base.applied_to_balance ?? 0);

    // Provide original raw values for backward compatibility in data payload
    const raw = { ...base };

    return {
      ...raw,
      ...normalizedPayment
    } as unknown as PaymentResponseDTO & { applied_to_expenses: number; applied_to_balance: number; fifo_result: unknown };
  }

  private async updateUserBalancesAfterPayment(payment: Payment, options?: { tx?: import('sequelize').Transaction }): Promise<BalanceResult | undefined> {
    let userIdToUpdate: number | null = null;
    let userRole: string | null = null;
    let appliedToExpenses = 0;
    let appliedToBalance = 0;
    let fifoResult: unknown = undefined;

    console.log('[PAYMENT BALANCE UPDATE] Processing payment', {
      id: payment.id,
      payer_type: payment.payer_type,
      payee_type: payment.payee_type,
      amount: payment.amount,
      transaction_id: payment.transaction_id
    });

    // EARLY EXIT: If this payment is linked to a transaction, do NOT update balance here
    // The TransactionService.updateUserBalances() method handles all transaction-related balance updates
    if (payment.transaction_id) {
      logger.info({ paymentId: payment.id, transactionId: payment.transaction_id }, 'Skipping balance update for transaction payment - handled by transaction service');
      return { appliedToExpenses: 0, appliedToBalance: 0 };
    }

    if (payment.payer_type === PARTY_TYPE.BUYER && payment.payee_type === PARTY_TYPE.SHOP) {
  // Buyer pays shop: reduce buyer's positive balance (buyer owes less). Negative buyer balance means shop owes buyer (refund scenario).
      userIdToUpdate = null; // counterparty_id not available on Payment model
      userRole = PARTY_TYPE.BUYER;
      // Defer balance mutation: unified recalculation later will update buyer balance based on unpaid amounts.
    } else if (payment.payer_type === PARTY_TYPE.FARMER && payment.payee_type === PARTY_TYPE.SHOP) {
  // Farmer pays shop: if farmer balance is negative (farmer owes shop) this payment moves balance toward 0 (increase). If balance positive, this would be unusual (farmer paying while shop owes) but we still recalc.
      userIdToUpdate = null; // counterparty_id not available on Payment model
      userRole = PARTY_TYPE.FARMER;

      if (userIdToUpdate && payment.shop_id) {
        const paymentAmount = Number(payment.amount);

        try {
          // Apply FIFO settlement to settle the farmer's pending expenses first
          fifoResult = await applyRepaymentFIFO(payment.shop_id, userIdToUpdate, paymentAmount, payment.id, options);
          const fifo = fifoResult as { remaining: number };
          const remainingAfterExpenses = fifo.remaining;
          const amountUsedForExpenses = paymentAmount - remainingAfterExpenses;
          appliedToExpenses = amountUsedForExpenses;
          appliedToBalance = remainingAfterExpenses;

          console.log('[PAYMENT] FIFO settlement applied for farmer->shop payment', {
            farmerId: userIdToUpdate,
            shopId: payment.shop_id,
            totalPayment: paymentAmount,
            usedForExpenses: amountUsedForExpenses,
            remainingForBalance: remainingAfterExpenses,
            fifoResult
          });

          const user = await User.findByPk(userIdToUpdate);
          if (user) {
            const previousBalance = Number(user.balance || 0);
            const amountAppliedToBalance = remainingAfterExpenses;
            
            // Since farmer is paying the shop, create a CREDIT ledger entry (payment received)
            try {
              await this.ledgerService.appendEntry({
                user_id: userIdToUpdate,
                shop_id: payment.shop_id!,
                direction: 'CREDIT',
                amount: amountAppliedToBalance,
                type: 'PAYMENT',
                reference_type: 'payment',
                reference_id: payment.id!,
                description: `Payment #${payment.id}: Farmer payment to shop (applied ₹${amountAppliedToBalance})`
              });

              console.log('[LEDGER] Created CREDIT entry for farmer->shop payment', {
                farmerId: userIdToUpdate,
                shopId: payment.shop_id,
                amount: amountAppliedToBalance,
                paymentId: payment.id
              });
            } catch (ledgerError) {
              console.error('[LEDGER ERROR] Failed to create payment ledger entry:', ledgerError);
              // Fallback: still update balance directly if ledger fails
              const newBalance = previousBalance + amountAppliedToBalance;
              await user.update({ balance: newBalance });
            }

            try {
              const amountChange = amountAppliedToBalance;
              if (amountChange !== 0) {
                await BalanceSnapshot.create({
                  user_id: userIdToUpdate,
                  balance_type: BalanceType.Farmer,
                  previous_balance: previousBalance,
                  amount_change: amountChange,
                  new_balance: previousBalance + amountChange,
                  transaction_type: 'payment',
                  reference_id: payment.id,
                  reference_type: 'payment',
                  description: `Farmer->shop payment applied to balance ${amountAppliedToBalance}`
                });
              }
            } catch (snapshotError: unknown) {
              const error = snapshotError as Error;
              console.warn(`[BALANCE SNAPSHOT WARNING] Could not create balance snapshot for user ${userIdToUpdate}:`, error?.message || 'Unknown error');
            }
          }

          return { appliedToExpenses, appliedToBalance, fifoResult };
        } catch (fifoError: unknown) {
          const error = fifoError as Error;
          console.warn('[PAYMENT] FIFO settlement failed for farmer->shop payment, proceeding with regular balance update', {
            error: error?.message || 'Unknown error',
            farmerId: userIdToUpdate,
            paymentAmount
          });
          // Fall through to regular balance recalculation if FIFO fails
        }
      }
    } else if (payment.payer_type === PARTY_TYPE.SHOP && payment.payee_type === PARTY_TYPE.FARMER) {
  // Shop pays farmer: reduce farmer's positive balance (shop settles earnings/expenses)
      userIdToUpdate = payment.counterparty_id;
      userRole = PARTY_TYPE.FARMER;

      if (userIdToUpdate && payment.shop_id) {
        const paymentAmount = Number(payment.amount);

        try {
          // Apply FIFO settlement to clear expenses first
          fifoResult = await applyRepaymentFIFO(payment.shop_id, userIdToUpdate, paymentAmount, payment.id, options);
          const fifo = fifoResult as { remaining: number };
          const remainingForBalance = fifo.remaining;
          const amountUsedForExpenses = paymentAmount - remainingForBalance;
          appliedToExpenses = amountUsedForExpenses;
          appliedToBalance = remainingForBalance;

          console.log('[PAYMENT] FIFO settlement applied for farmer payment', {
            farmerId: userIdToUpdate,
            shopId: payment.shop_id,
            totalPayment: paymentAmount,
            usedForExpenses: amountUsedForExpenses,
            remainingForBalance: remainingForBalance,
            fifoResult
          });

          const user = await User.findByPk(userIdToUpdate);
          if (user) {
            const previousBalance = Number(user.balance || 0);
            
            // When shop pays farmer, create a DEBIT ledger entry (payment made)
            try {
              await this.ledgerService.appendEntry({
                user_id: userIdToUpdate,
                shop_id: payment.shop_id!,
                direction: 'DEBIT',
                amount: remainingForBalance,
                type: 'PAYMENT',
                reference_type: 'payment',
                reference_id: payment.id!,
                description: `Payment #${payment.id}: Shop payment to farmer (applied ₹${remainingForBalance})`
              });

              console.log('[LEDGER] Created DEBIT entry for shop->farmer payment', {
                farmerId: userIdToUpdate,
                shopId: payment.shop_id,
                amount: remainingForBalance,
                paymentId: payment.id
              });
            } catch (ledgerError) {
              console.error('[LEDGER ERROR] Failed to create payment ledger entry:', ledgerError);
              // Fallback: still update balance directly if ledger fails
              const newBalance = previousBalance - remainingForBalance;
              await user.update({ balance: newBalance });
            }

            // Create balance snapshot
            try {
              const amountChange = -remainingForBalance;
              if (amountChange !== 0) {
                await BalanceSnapshot.create({
                  user_id: userIdToUpdate,
                  balance_type: BalanceType.Farmer,
                  previous_balance: previousBalance,
                  amount_change: amountChange,
                  new_balance: previousBalance + amountChange,
                  transaction_type: 'payment',
                  reference_id: payment.id,
                  reference_type: 'payment',
                  description: `Shop->Farmer payment: ₹${paymentAmount} (${amountUsedForExpenses} to expenses, ${remainingForBalance} to balance)`
                });
              }
            } catch (snapshotError: unknown) {
              const error = snapshotError as Error;
              console.warn(`[BALANCE SNAPSHOT WARNING] Could not create balance snapshot for user ${userIdToUpdate}:`, error?.message || 'Unknown error');
            }
          }

          // Return breakdown
          return { appliedToExpenses, appliedToBalance, fifoResult };

        } catch (fifoError: unknown) {
          const error = fifoError as Error;
          console.warn('[PAYMENT] FIFO settlement failed, proceeding with regular balance update', {
            error: error?.message || 'Unknown error',
            farmerId: userIdToUpdate,
            paymentAmount
          });
          // Fall through to regular balance update if FIFO fails
        }
      }
    } else if (payment.payer_type === PARTY_TYPE.SHOP && payment.payee_type === PARTY_TYPE.BUYER) {
      // Shop pays buyer: refund reduces buyer's positive balance (buyer owes less)
      userIdToUpdate = payment.counterparty_id;
      userRole = PARTY_TYPE.BUYER;
      appliedToBalance = Number(payment.amount);

      // Directly update buyer balance for refunds
      if (userIdToUpdate) {
        const user = await User.findByPk(userIdToUpdate);
        if (user) {
          const previousBalance = Number(user.balance || 0);
          // When shop pays buyer (refund), buyer's debt to shop decreases -> balance decreases
          const newBalance = previousBalance - Number(payment.amount);
          await user.update({ balance: newBalance });

          console.log('[BUYER REFUND] Updated balance after shop->buyer payment', {
            buyerId: userIdToUpdate,
            previousBalance,
            refundAmount: Number(payment.amount),
            newBalance
          });

          try {
            await BalanceSnapshot.create({
              user_id: userIdToUpdate,
              balance_type: BalanceType.Buyer,
              previous_balance: previousBalance,
              amount_change: newBalance - previousBalance,
              new_balance: newBalance,
              transaction_type: 'payment',
              reference_id: payment.id,
              reference_type: 'payment',
              description: `Shop->Buyer refund: ${payment.amount}`
            });
          } catch (snapshotError: unknown) {
            const error = snapshotError as Error;
            console.warn(`[BALANCE SNAPSHOT WARNING] Could not create snapshot for buyer ${userIdToUpdate}:`, error?.message || 'Unknown error');
          }
        }
      }

      return { appliedToExpenses: 0, appliedToBalance: appliedToBalance, fifoResult: undefined };
    }

    if (userIdToUpdate && userRole) {
      const user = await User.findByPk(userIdToUpdate);
      if (!user) throw new Error(`User with id ${userIdToUpdate} not found`);

      // Capture previous balance BEFORE recalculation
      const previousBalance = Number(user.balance || 0);

      // IMPORTANT: Don't manually adjust balance - recalculate from transactions and payments
      // This ensures consistency with how TransactionService calculates balances
      let newBalance = previousBalance;
      
      if (userRole === PARTY_TYPE.FARMER) {
        // Recalculate farmer balance: sum of unpaid transaction earnings minus expenses
        const { Op } = await import('sequelize');
        const Transaction = (await import('../models/transaction')).Transaction;
        const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
        const Payment = (await import('../models/payment')).Payment;
        
        // Get all transactions for this farmer
        const allFarmerTxns = await Transaction.findAll({ 
          where: { farmer_id: userIdToUpdate } 
        });
        
        const txnIds = allFarmerTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');
        
        // Get all payment allocations and payments for these transactions
        const allocations = await PaymentAllocation.findAll({ 
          where: { transaction_id: { [Op.in]: txnIds } } 
        });
        const payments = await Payment.findAll({ 
          where: { transaction_id: { [Op.in]: txnIds } } 
        });
        
        // Calculate unpaid earnings from transactions
        const unpaidTransactionEarnings = allFarmerTxns.reduce((sum, t) => {
          const paidToFarmer = allocations
            .filter(a => a.transaction_id === t.id)
            .map(a => {
              const pmt = payments.find(p => p.id === a.payment_id);
              if (pmt && pmt.payee_type === PARTY_TYPE.FARMER && pmt.status === 'PAID') {
                return Number(a.allocated_amount || 0);
              }
              return 0;
            })
            .reduce((s, v) => s + v, 0);
          const unpaid = Math.max(Number(t.farmer_earning || 0) - paidToFarmer, 0);
          return sum + unpaid;
        }, 0);
        
        // Subtract UNSETTLED expenses from farmer balance
        // Expenses represent money farmer owes to shop (advances, reimbursements, etc.)
        const ExpenseSettlement = (await import('../models/expenseSettlement')).default;
        const Expense = (await import('../models/expense')).default;
        
        // Get all expenses for this farmer
        const farmerExpenses = await Expense.findAll({
          where: {
            user_id: userIdToUpdate,
            shop_id: payment.shop_id
          }
        });
        
        // For each expense, calculate unsettled amount
        let totalUnsettledExpenses = 0;
        for (const expense of farmerExpenses) {
          const expenseAmount = Number(expense.amount || 0);
          
          // Get sum of settled amounts for this expense
          const settlements = await ExpenseSettlement.findAll({
            where: { expense_id: expense.id }
          });
          const settledAmount = settlements.reduce((sum: number, s) => 
            sum + Number(s.amount || 0), 0);
          
          // Unsettled portion = expense amount - settled amount
          const unsettled = Math.max(0, expenseAmount - settledAmount);
          totalUnsettledExpenses += unsettled;
        }
        
        newBalance = Math.round((unpaidTransactionEarnings - totalUnsettledExpenses) * 100) / 100;
        
      } else if (userRole === PARTY_TYPE.BUYER) {
        // Recalculate buyer balance: sum of unpaid transaction gross amounts minus PAID buyer allocations
        // Business meaning: Positive buyer balance = buyer owes shop (unpaid purchases). Negative = shop owes buyer (overpayment/refund scenario).
        const { Op } = await import('sequelize');
        const Transaction = (await import('../models/transaction')).Transaction;
        const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
        const Payment = (await import('../models/payment')).Payment;

        // Get all transactions for this buyer
        const allBuyerTxns = await Transaction.findAll({ 
          where: { buyer_id: userIdToUpdate } 
        });

        const txnIds = allBuyerTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');

        // Get all payment allocations and payments for these transactions
        const buyerAllocations = await PaymentAllocation.findAll({ 
          where: { transaction_id: { [Op.in]: txnIds } } 
        });
        const buyerPayments = await Payment.findAll({ 
          where: { transaction_id: { [Op.in]: txnIds } } 
        });

        // Instrumentation accumulator
        let debugTotalGross = 0;
        let debugTotalPaid = 0;
        let debugUnpaid = 0;

        newBalance = allBuyerTxns.reduce((sum, t) => {
          const gross = Number(t.total_amount || 0);
          const paidByBuyer = buyerAllocations
            .filter(a => a.transaction_id === t.id)
            .map(a => {
              const pmt = buyerPayments.find(p => p.id === a.payment_id);
              // Only count actually PAID buyer-originated payments
              if (pmt && pmt.payer_type === PARTY_TYPE.BUYER && pmt.status === 'PAID') {
                return Number(a.allocated_amount || 0);
              }
              return 0;
            })
            .reduce((s, v) => s + v, 0);
          const unpaid = Math.max(gross - paidByBuyer, 0);
          debugTotalGross += gross;
          debugTotalPaid += paidByBuyer;
          debugUnpaid += unpaid;
          return sum + unpaid;
        }, 0);

        // If there are shop->buyer refund payments (payer=SHOP payee=BUYER) without allocations, treat them as overpayments reducing balance
        const refundPayments = await Payment.findAll({ where: { payer_type: PARTY_TYPE.SHOP, payee_type: PARTY_TYPE.BUYER, status: 'PAID' } });
        const refundTotal = refundPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        if (refundTotal > 0) {
          newBalance = newBalance - refundTotal; // subtract refunds
        }

        // ALSO subtract standalone bookkeeping payments made by the buyer (payer=BUYER payee=SHOP, transaction_id IS NULL)
        // These represent direct payments from buyer to shop that should reduce buyer's outstanding balance
        try {
          const bookkeepingPayments = await Payment.findAll({
            where: {
              transaction_id: null,
              payer_type: PARTY_TYPE.BUYER,
              payee_type: PARTY_TYPE.SHOP,
              counterparty_id: userIdToUpdate,
              status: 'PAID'
            }
          });

          // Exclude bookkeeping payments that have allocations recorded (they are already counted via allocations)
          const bkPaymentIds = bookkeepingPayments.map(p => Number(p.id));
          let unallocatedTotal = 0;
          if (bkPaymentIds.length > 0) {
            const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
            const allocs = await PaymentAllocation.findAll({ where: { payment_id: bkPaymentIds } });
            const allocatedIds = new Set<number>(allocs.map(a => Number(a.payment_id)));
            for (const p of bookkeepingPayments) {
              if (!allocatedIds.has(Number(p.id))) {
                unallocatedTotal += Number(p.amount || 0);
              }
            }
          }

          if (unallocatedTotal > 0) {
            console.log('[BUYER BOOKKEEPING] Subtracting unallocated buyer bookkeeping payments from balance:', unallocatedTotal);
            newBalance = newBalance - unallocatedTotal;
          }
        } catch (bkErr) {
          console.warn('[BUYER BOOKKEEPING] Failed to adjust for bookkeeping payments:', (bkErr as Error).message || bkErr);
        }

        console.log('[BUYER BALANCE RECALC]', {
          buyerId: userIdToUpdate,
          transactions: allBuyerTxns.length,
          grossTotal: debugTotalGross,
          paidAllocations: debugTotalPaid,
          unpaidPortion: debugUnpaid,
          refundTotal,
          recalculatedBalance: newBalance
        });

        newBalance = Math.round(newBalance * 100) / 100;
      }
      
      // NOTE: Negative balances are ALLOWED per business logic
      // Farmers can have negative balances (advances/expenses exceed earnings)
      // Buyers can have negative balances (overpayments)

      await user.update({ balance: newBalance });

      // Create balance snapshot with error handling
      try {
        const amountChange = newBalance - previousBalance;
        if (amountChange !== 0 && (userRole === PARTY_TYPE.BUYER || userRole === PARTY_TYPE.FARMER)) {
            await BalanceSnapshot.create({
            user_id: userIdToUpdate,
            balance_type: userRole === PARTY_TYPE.BUYER ? BalanceType.Buyer : BalanceType.Farmer,
            previous_balance: previousBalance,
            amount_change: amountChange,
            new_balance: newBalance,
            transaction_type: 'payment',
            reference_id: payment.id,
            reference_type: 'payment',
            description: `Payment ${payment.payer_type} -> ${payment.payee_type}: ${payment.amount}`
          });
        }
      } catch (snapshotError: unknown) {
        const error = snapshotError as Error;
        console.warn(`[BALANCE SNAPSHOT WARNING] Could not create snapshot for user ${userIdToUpdate}:`, error?.message || 'Unknown error');
      }

      console.log(`[${userRole.toUpperCase()} BALANCE UPDATE] UserID: ${userIdToUpdate}, New Balance: ${newBalance}`);
      appliedToBalance = appliedToBalance || (userRole === PARTY_TYPE.FARMER || userRole === PARTY_TYPE.BUYER ? Number(payment.amount) : 0);
      
      // Update payment record with balance tracking information
      try {
        const updateOptions = options?.tx ? { transaction: options.tx } : {};
        await payment.update({
          balance_before: previousBalance,
          balance_after: newBalance
        }, updateOptions);
        console.log(`[PAYMENT BALANCE TRACKING] Updated payment #${payment.id} with balance info`, {
          balance_before: previousBalance,
          balance_after: newBalance,
          applied_to_expenses: appliedToExpenses,
          applied_to_balance: appliedToBalance
        });
      } catch (updateError: unknown) {
        const error = updateError as Error;
        console.warn(`[PAYMENT UPDATE WARNING] Could not update payment #${payment.id} with balance tracking:`, error?.message || 'Unknown error');
      }
      
      return { appliedToExpenses, appliedToBalance, fifoResult };
    }
  }

  private async allocatePaymentToTransactions(payment: Payment, options?: { tx?: import('sequelize').Transaction }): Promise<void> {
    const paymentAmount = Number(payment.amount || 0);
    
    // BUYER → SHOP payments: Allocate to buyer's outstanding transactions
    if (payment.payer_type === PARTY_TYPE.BUYER && payment.payee_type === PARTY_TYPE.SHOP) {
      if (payment.transaction_id) {
        try {
          const targetTx = await Transaction.findByPk(payment.transaction_id);
          if (targetTx) {
            const transactionTotal = Number(targetTx.total_amount || 0);
            const existingAllocations = await PaymentAllocation.findAll({ where: { transaction_id: targetTx.id }, transaction: options?.tx });
            const alreadyPaid = existingAllocations.reduce((sum, alloc) => sum + Number(alloc.allocated_amount || 0), 0);
            const outstandingAmount = Math.max(transactionTotal - alreadyPaid, 0);
            if (outstandingAmount > 0) {
              const allocationAmount = Math.min(paymentAmount, outstandingAmount);
              await PaymentAllocation.create({ payment_id: payment.id, transaction_id: targetTx.id, allocated_amount: allocationAmount }, options?.tx ? { transaction: options.tx } : undefined);
                // Realize owner's commission proportionally for this allocation
                try {
                  const txn = targetTx; // Transaction model instance
                  const txnTotal = Number(txn.total_amount || 0);
                  const txnCommission = Number(txn.commission_amount || 0);
                  if (txnTotal > 0 && txnCommission > 0 && payment.shop_id) {
                    const commissionShare = Number((allocationAmount * (txnCommission / txnTotal)).toFixed(2));
                    if (commissionShare > 0) {
                      // Find shop owner and increment their cumulative_value atomically
                      const Shop = (await import('../models/shop')).Shop;
                      const shop = await Shop.findByPk(Number(payment.shop_id), { transaction: options?.tx });
                      if (shop && shop.owner_id) {
                        const ownerId = Number(shop.owner_id);
                        try {
                          // Use sequelize increment for atomic update
                          await User.increment({ cumulative_value: commissionShare }, { where: { id: ownerId } });
                          // Optionally create an audit log entry (reuse existing action enum)
                          await AuditLog.create({
                            shop_id: Number(payment.shop_id) || 1,
                            user_id: 1,
                            action: 'payment_recorded',
                            entity_type: 'transaction',
                            entity_id: txn.id,
                            new_values: JSON.stringify({ allocated_amount: allocationAmount, commission_realized: commissionShare }),
                          });
                        } catch (incErr) {
                          console.warn('[COMMISSION] Failed to increment owner cumulative_value', { ownerId, commissionShare, err: (incErr as Error).message || incErr });
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn('[COMMISSION] Error computing commission share for allocation', { paymentId: payment.id, transactionId: targetTx.id, err: (err as Error).message || err });
                }
              console.log('[ALLOCATE] Direct allocation via payment.transaction_id', { paymentId: payment.id, transactionId: targetTx.id, allocationAmount });
            } else {
              console.log('[ALLOCATE] Target transaction already fully allocated', { transactionId: targetTx.id, alreadyPaid, transactionTotal });
            }
          } else {
            console.log('[ALLOCATE] Referenced transaction_id not found', { transaction_id: payment.transaction_id });
          }
        } catch (directErr: unknown) {
          const error = directErr as Error;
          console.warn('[ALLOCATE] Direct allocation error', error?.message || directErr);
        }
      } else if (payment.counterparty_id) {
        // Standalone buyer payment (no specific transaction).
        // Historically we applied FIFO allocation immediately which converted bookkeeping
        // payments into allocated payments and prevented them from being counted as
        // "bookkeeping" payments that reduce overall buyer_payments_due. To ensure that
        // buyer-initiated standalone payments reduce receivables on the owner dashboard by
        // default, skip automatic FIFO allocation unless explicitly enabled via env.
        if (process.env.ALLOCATE_STANDALONE_BUYER_PAYMENTS === 'true') {
          try {
            const Transaction = (await import('../models/transaction')).Transaction;
            const buyerTransactions = await Transaction.findAll({
              where: { buyer_id: payment.counterparty_id },
              order: [['transaction_date', 'ASC'], ['id', 'ASC']]
            });
            let remaining = paymentAmount;
            for (const txn of buyerTransactions) {
              if (remaining <= 0) break;
              const totalAmount = Number(txn.total_amount || 0);
              // Fetch existing allocations for this txn
              const existingAllocations = await PaymentAllocation.findAll({ where: { transaction_id: txn.id } });
              // Link allocations to payments and sum only buyer payments that are PAID
              const Payment = (await import('../models/payment')).Payment;
              const paymentIds = existingAllocations.map(a => a.payment_id);
              const relatedPayments = paymentIds.length ? await Payment.findAll({ where: { id: paymentIds }, transaction: options?.tx }) : [];
              const alreadyPaidByBuyer = existingAllocations
                .filter(a => {
                  const pmt = relatedPayments.find(p => p.id === a.payment_id);
                  return pmt && pmt.payer_type === PARTY_TYPE.BUYER && pmt.status === 'PAID';
                })
                .reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);
              const outstandingForBuyer = Math.max(totalAmount - alreadyPaidByBuyer, 0);
              if (outstandingForBuyer > 0) {
                const allocationAmount = Math.min(remaining, outstandingForBuyer);
                await PaymentAllocation.create({ payment_id: payment.id, transaction_id: txn.id, allocated_amount: allocationAmount });
                remaining -= allocationAmount;
                console.log('[ALLOCATE] Standalone buyer payment allocated', { paymentId: payment.id, transactionId: txn.id, allocationAmount, remaining });
              }
            }
            if (remaining > 0) {
              console.log('[ALLOCATE] Buyer payment has unallocated remainder (overpayment)', { paymentId: payment.id, unallocatedAmount: remaining });
            }
          } catch (buyerErr) {
            console.error('[ALLOCATE] Error allocating standalone buyer payment', buyerErr);
          }
        } else {
          // By default, do not allocate standalone buyer payments automatically. Treat them
          // as bookkeeping payments that reduce buyer_receivables at owner dashboard computation.
          console.log('[ALLOCATE] Skipping automatic FIFO allocation for standalone BUYER->SHOP payment', { paymentId: payment.id });
        }
      }
    }
    
    // SHOP → FARMER payments: Allocate to farmer's outstanding transactions
    if (payment.payer_type === PARTY_TYPE.SHOP && payment.payee_type === PARTY_TYPE.FARMER) {
      if (payment.transaction_id) {
        try {
          const targetTx = await Transaction.findByPk(payment.transaction_id);
          if (targetTx) {
            const farmerEarning = Number(targetTx.farmer_earning || 0);
            const existingAllocations = await PaymentAllocation.findAll({ where: { transaction_id: targetTx.id } });
            // Calculate how much has already been paid to farmer for this transaction
            const Payment = (await import('../models/payment')).Payment;
            const paymentIds = existingAllocations.map(a => a.payment_id);
            const relatedPayments = paymentIds.length > 0 ? await Payment.findAll({ where: { id: paymentIds } }) : [];
            const alreadyPaidToFarmer = existingAllocations
              .filter(a => {
                const pmt = relatedPayments.find(p => p.id === a.payment_id);
                return pmt && pmt.payee_type === PARTY_TYPE.FARMER && pmt.status === 'PAID';
              })
              .reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);
            const outstandingForFarmer = Math.max(farmerEarning - alreadyPaidToFarmer, 0);
            if (outstandingForFarmer > 0) {
              const allocationAmount = Math.min(paymentAmount, outstandingForFarmer);
              await PaymentAllocation.create({ payment_id: payment.id, transaction_id: targetTx.id, allocated_amount: allocationAmount });
              console.log('[ALLOCATE] Direct allocation for SHOP->FARMER payment', { paymentId: payment.id, transactionId: targetTx.id, allocationAmount });
            } else {
              console.log('[ALLOCATE] Target transaction already fully allocated for farmer', { transactionId: targetTx.id, alreadyPaidToFarmer, farmerEarning });
            }
          } else {
            console.log('[ALLOCATE] Referenced transaction_id not found for SHOP->FARMER payment', { transaction_id: payment.transaction_id });
          }
        } catch (directErr: unknown) {
          const error = directErr as Error;
          console.warn('[ALLOCATE] Direct allocation error for SHOP->FARMER payment', error?.message || directErr);
        }
      } else if (payment.counterparty_id) {
        // Standalone farmer payment (no specific transaction): apply FIFO to farmer's outstanding transactions
        try {
          const Transaction = (await import('../models/transaction')).Transaction;
          const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
          
          // Get all farmer transactions ordered by date (FIFO)
          const farmerTransactions = await Transaction.findAll({
            where: { farmer_id: payment.counterparty_id },
            order: [['transaction_date', 'ASC'], ['id', 'ASC']]
          });
          
          let remainingAmount = paymentAmount;
          
          for (const txn of farmerTransactions) {
            if (remainingAmount <= 0) break;
            
            const farmerEarning = Number(txn.farmer_earning || 0);
            
            // Get existing allocations for this transaction
            const existingAllocations = await PaymentAllocation.findAll({
              where: { transaction_id: txn.id }
            });
            
            // Calculate how much has already been paid to farmer for this transaction
            const Payment = (await import('../models/payment')).Payment;
            const paymentIds = existingAllocations.map(a => a.payment_id);
            const relatedPayments = paymentIds.length > 0 
              ? await Payment.findAll({ where: { id: paymentIds } })
              : [];
            
            const alreadyPaidToFarmer = existingAllocations
              .filter(a => {
                const pmt = relatedPayments.find(p => p.id === a.payment_id);
                return pmt && pmt.payee_type === PARTY_TYPE.FARMER && pmt.status === 'PAID';
              })
              .reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);
            
            const outstandingForFarmer = Math.max(farmerEarning - alreadyPaidToFarmer, 0);
            
            if (outstandingForFarmer > 0) {
              const allocationAmount = Math.min(remainingAmount, outstandingForFarmer);
              
              await PaymentAllocation.create({
                payment_id: payment.id,
                transaction_id: txn.id,
                allocated_amount: allocationAmount
              });
              
              remainingAmount -= allocationAmount;
              
              console.log('[ALLOCATE] Standalone farmer payment allocated to transaction', {
                paymentId: payment.id,
                transactionId: txn.id,
                allocationAmount,
                remainingAmount
              });
            }
          }
          
          if (remainingAmount > 0) {
            console.log('[ALLOCATE] Farmer payment has unallocated amount (advance payment)', {
              paymentId: payment.id,
              unallocatedAmount: remainingAmount
            });
          }
        } catch (error: unknown) {
          console.error('[ALLOCATE] Error allocating standalone farmer payment', error);
        }
      }
    }
  }

  async createBulkPayments(data: import('../dtos/PaymentDTO').BulkPaymentDTO, _userId: number): Promise<PaymentResponseDTO[]> {
    const results: PaymentResponseDTO[] = [];
    for (const item of data.payments) {
      // Map DTO values to enums for bulk
    const paymentData: Record<string, unknown> = {
      transaction_id: item.transaction_id,
      payer_type: PaymentParty[data.payer_type as keyof typeof PaymentParty],
      payee_type: PaymentParty[data.payee_type as keyof typeof PaymentParty],
      amount: Math.abs(Number(item.amount || 0)),
      method: PaymentMethod[data.method as keyof typeof PaymentMethod],
      status: data.status ? PaymentStatus[data.status as keyof typeof PaymentStatus] : PaymentStatus.Pending,
      notes: data.notes,
    };
  const payment = await this.paymentRepository.create(paymentData as PaymentCreationAttributes);
    if (payment) results.push(payment.toJSON() as PaymentResponseDTO);
    }
    return results;
  }

  async updatePaymentStatus(paymentId: number, data: UpdatePaymentStatusDTO, userId: number): Promise<PaymentResponseDTO | null> {
  const payment = await this.paymentRepository.findByTransactionId(paymentId).then(arr => arr[0]);
    if (!payment) {
      logger.error({ paymentId }, '[updatePaymentStatus] Payment not found');
      return null;
    }

    const oldValues = payment.toJSON();
    try {
      await payment.update({
        status: PaymentStatus[data.status as keyof typeof PaymentStatus],
        payment_date: data.payment_date || new Date(),
        notes: data.notes !== undefined ? data.notes : payment.notes
      });
    } catch (err: unknown) {
      logger.error({ err, paymentId }, '[updatePaymentStatus] Error updating payment');
      throw err;
    }


    // Fetch the related transaction to get the correct shop_id
    let shop_id = 0;
    if (payment.transaction_id != null) {
      const relatedTransaction = await Transaction.findByPk(payment.transaction_id);
      if (!relatedTransaction) throw new Error('Related transaction not found for payment audit log');
      shop_id = relatedTransaction.shop_id;
    }
    await AuditLog.create({
      shop_id,
      user_id: userId,
      action: 'payment_recorded',
      entity_type: 'payment',
      entity_id: payment.id,
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify(payment.toJSON())
    });

    // If payment is now PAID and linked to a transaction, update transaction status
  if (payment.status === PAYMENT_STATUS.PAID && payment.transaction_id) {
      const { TransactionService } = await import('./transactionService');
      const txnService = new TransactionService();
      await txnService.updateTransactionStatus(payment.transaction_id);
    }
    return payment.toJSON() as PaymentResponseDTO;
  }

  async getPaymentsByTransaction(transactionId: number): Promise<PaymentResponseDTO[]> {
    const payments = await this.paymentRepository.findByTransactionId(transactionId);
    return payments.map((p: Payment) => p.toJSON() as PaymentResponseDTO);
  }

  /**
   * Public API: allocate specified amounts from a payment to transactions.
   * Idempotent: will not duplicate identical allocation rows.
   */
  async allocatePayment(paymentId: number, allocations: Array<{ transaction_id: number; amount: number }>, options?: { userId?: number; dryRun?: boolean }) {
    // Validate payment exists and is PAID
    const { Payment } = await import('../models');
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (String(payment.status).toUpperCase() !== 'PAID') throw new Error('Only PAID payments can be allocated');

    // Compute remaining available amount considering previous allocations
    const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
    const existingAlloc = await PaymentAllocation.findAll({ where: { payment_id: paymentId } });
    const alreadyAllocated = existingAlloc.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
    const available = Math.max(Number(payment.amount || 0) - alreadyAllocated, 0);

    const totalRequested = allocations.reduce((s, a) => s + Number(a.amount || 0), 0);
    if (totalRequested > available) {
      throw new Error(`Requested allocations ${totalRequested} exceed available payment amount ${available}`);
    }

    // Dry-run returns planned actions
    if (options?.dryRun) {
      return { paymentId, available, alreadyAllocated, planned: allocations };
    }

  // Apply allocations in a transaction
  const models = await import('../models');
  const sequelize = models.sequelize;
  return await sequelize.transaction(async (tx: import('sequelize').Transaction) => {
      const results: Array<{ transaction_id: number; amount: number }>= [];
      for (const a of allocations) {
        // Idempotency check: identical allocation exists
        const found = await PaymentAllocation.findOne({ where: { payment_id: paymentId, transaction_id: a.transaction_id, allocated_amount: a.amount }, transaction: tx });
        if (found) {
          results.push({ transaction_id: a.transaction_id, amount: a.amount });
          continue;
        }

        await PaymentAllocation.create({ payment_id: paymentId, transaction_id: a.transaction_id, allocated_amount: a.amount }, { transaction: tx });
        // Increment allocated_amount on payment for quick reads using raw update (safer across schemas)
        try {
          await sequelize.query(`UPDATE kisaan_payments SET allocated_amount = COALESCE(allocated_amount,0) + :amt WHERE id = :pid`, { replacements: { amt: a.amount, pid: paymentId }, transaction: tx });
        } catch (incErr) {
          // ignore if column missing or increment fails
        }
        results.push({ transaction_id: a.transaction_id, amount: a.amount });
      }

      // Optionally create an audit log
      try {
        const AuditLog = (await import('../models/auditLog')).AuditLog;
        await AuditLog.create({ shop_id: payment.shop_id || 1, user_id: options?.userId || 1, action: 'payment_recorded', entity_type: 'payment', entity_id: paymentId, new_values: JSON.stringify({ allocations: results }) }, { transaction: tx });
      } catch (auditErr) {
        // ignore audit failures
      }

      return { paymentId, applied: results };
    });
  }

  async getOutstandingPayments(shopId?: number): Promise<PaymentResponseDTO[]> {
    const transactionInclude: Record<string, unknown> = {
      model: Transaction,
      as: 'transaction',
      attributes: ['id', 'shop_id', 'farmer_id', 'buyer_id', 'total_amount', 'farmer_earning']
    };
    if (shopId) {
      transactionInclude.where = { shop_id: shopId };
    }
  const payments = await this.paymentRepository.findByStatus(PaymentStatus.Pending);
    // Note: transactionInclude logic may need to be handled in repository for full parity
    return payments.map((p: Payment) => p.toJSON() as PaymentResponseDTO);
  }
  /**
   * Get all payments to a farmer (payee_type = 'FARMER'), with optional date filtering and aggregation
   */
  async getPaymentsToFarmer(
    farmerId: number,
    options?: { startDate?: Date; endDate?: Date; shopId?: number }
  ): Promise<{ 
    totalPayments: number; 
    totalPaid: number; 
    payments: PaymentResponseDTO[];
    expenses: {
      totalExpenses: number;
      totalSettled: number;
      totalUnsettled: number;
      expenses: Array<{
        id: number;
        amount: number;
        settled: number;
        unsettled: number;
        description: string;
        created_at: Date;
        status: string;
      }>;
    };
  }> {
    try {
      // Fetch payments
      const where: Record<string, unknown> = {
        payee_type: PARTY_TYPE.FARMER,
        status: { [Op.not]: PAYMENT_STATUS.FAILED }
      };
      if (options?.startDate && options?.endDate) {
        where.created_at = { [Op.between]: [options.startDate, options.endDate] };
      }
      const payments = await this.paymentRepository.findByFilters(where);
      const totalPaid = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
      
      // Fetch expenses for this farmer
      const Expense = (await import('../models/expense')).default;
      const ExpenseSettlement = (await import('../models/expenseSettlement')).default;
      
      const expenseWhere: Record<string, unknown> = {
        user_id: farmerId
      };
      if (options?.shopId) {
        expenseWhere.shop_id = options.shopId;
      }
      
      const farmerExpenses = await Expense.findAll({
        where: expenseWhere,
        order: [['created_at', 'DESC']]
      });
      
      // Calculate settled and unsettled amounts for each expense
      const expenseDetails = await Promise.all(
        farmerExpenses.map(async (expense) => {
          const expenseAmount = Number(expense.amount || 0);
          
          // Get settlements for this expense
          const settlements = await ExpenseSettlement.findAll({
            where: { expense_id: expense.id }
          });
          const settledAmount = settlements.reduce((sum: number, s) => 
            sum + Number(s.amount || 0), 0);
          
          const unsettledAmount = Math.max(0, expenseAmount - settledAmount);
          
          return {
            id: expense.id,
            amount: expenseAmount,
            settled: settledAmount,
            unsettled: unsettledAmount,
            description: expense.description || '',
            created_at: expense.created_at,
            status: expense.status
          };
        })
      );
      
      const totalExpenses = expenseDetails.reduce((sum, e) => sum + e.amount, 0);
      const totalSettled = expenseDetails.reduce((sum, e) => sum + e.settled, 0);
      const totalUnsettled = expenseDetails.reduce((sum, e) => sum + e.unsettled, 0);
      
      return {
        totalPayments: payments.length,
        totalPaid,
        payments: payments.map((p: Payment) => p.toJSON() as PaymentResponseDTO),
        expenses: {
          totalExpenses,
          totalSettled,
          totalUnsettled,
          expenses: expenseDetails
        }
      };
    } catch (error) {
      logger.error({ farmerId, options, error }, 'Error fetching payments to farmer');
      throw error;
    }
  }

  /**
   * Get all payments by a buyer (payer_type = 'BUYER'), with optional date filtering and aggregation
   */
  async getPaymentsByBuyer(
    buyerId: number,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<{ totalPayments: number; totalPaid: number; payments: PaymentResponseDTO[] }> {
    try {
      const where: Record<string, unknown> = {
        payer_type: PARTY_TYPE.BUYER,
        status: { [Op.not]: PAYMENT_STATUS.FAILED }
      };
      if (options?.startDate && options?.endDate) {
        where.created_at = { [Op.between]: [options.startDate, options.endDate] };
      }
      const payments = await this.paymentRepository.findByFilters(where);
      const totalPaid = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
      return {
        totalPayments: payments.length,
        totalPaid,
        payments: payments.map((p: Payment) => p.toJSON() as PaymentResponseDTO)
      };
    } catch (error) {
      logger.error({ buyerId, options, error }, 'Error fetching payments by buyer');
      throw error;
    }
  }

  /**
   * Adjust existing payments when an expense is entered retroactively
   * Applies expense amount to reduce recent payments to the farmer (reverse FIFO - newest first)
   */
  async adjustPaymentsForExpense(
    shopId: number,
    farmerId: number,
    expenseAmount: number,
    expenseId: number,
    options?: { tx?: import('sequelize').Transaction }
  ): Promise<{ adjustedPayments: Array<{ paymentId: number; originalAmount: number; adjustedAmount: number; adjustment: number }>; totalAdjusted: number }> {
    const adjustedPayments: Array<{ paymentId: number; originalAmount: number; adjustedAmount: number; adjustment: number }> = [];
    let remainingExpense = expenseAmount;
    let totalAdjusted = 0;

    // Find recent payments made to this farmer (last 30 days, ordered by newest first)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await this.paymentRepository.findByFilters({
      shop_id: shopId,
      payer_type: PaymentParty.Shop,
      payee_type: PaymentParty.Farmer,
      status: PaymentStatus.Paid,
      created_at: { [Op.gte]: thirtyDaysAgo }
    }, { order: [['created_at', 'DESC']] }); // Newest first (reverse FIFO)

    for (const payment of recentPayments) {
      if (remainingExpense <= 0) break;

      const paymentAmount = Number(payment.amount);
      const adjustment = Math.min(remainingExpense, paymentAmount);

      if (adjustment > 0) {
        const newAmount = paymentAmount - adjustment;

        // Update payment amount
        await payment.update(
          {
            amount: newAmount,
            notes: `${payment.notes || ''} [ADJUSTED: -₹${adjustment} for expense #${expenseId}]`.trim()
          },
          options?.tx ? { transaction: options.tx } : undefined
        );

        // Log the adjustment
        await AuditLog.create({
          user_id: 1, // System user for automated adjustments
          action: 'payment_recorded', // Use existing action type
          entity_type: 'payment',
          entity_id: payment.id,
          old_values: JSON.stringify({ amount: paymentAmount }),
          new_values: JSON.stringify({ amount: newAmount }),
          shop_id: shopId
        });

        adjustedPayments.push({
          paymentId: payment.id,
          originalAmount: paymentAmount,
          adjustedAmount: newAmount,
          adjustment: adjustment
        });

        remainingExpense -= adjustment;
        totalAdjusted += adjustment;

        logger.info({
          paymentId: payment.id,
          expenseId,
          originalAmount: paymentAmount,
          adjustedAmount: newAmount,
          adjustment
        }, 'Payment adjusted for retroactive expense');
      }
    }

    return { adjustedPayments, totalAdjusted };
  }
}