/**
 * Transaction Domain Interfaces
 * Core business models for transaction operations
 */

import { TransactionStatus } from '../../shared/enums';

export interface TransactionParticipants {
  shopId: number;
  farmerId: number;
  buyerId: number;
  ownerId: number;
}

export interface TransactionProduct {
  id?: number;
  name: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
}

export interface TransactionAmounts {
  totalAmount: number;
  farmerEarning: number;
  commissionAmount: number;
  commissionRate: number;
}

export interface TransactionPayment {
  payerType: 'BUYER' | 'SHOP';
  payeeType: 'SHOP' | 'FARMER';
  amount: number;
  method: 'CASH' | 'BANK' | 'UPI' | 'OTHER';
  status: 'PENDING' | 'PAID' | 'FAILED';
  paymentDate?: Date;
  notes?: string;
}

export interface TransactionMetadata {
  commissionConfirmed?: boolean;
  partialPaymentAllowed?: boolean;
  [key: string]: unknown;
}

export interface CreateTransactionRequest {
  participants: TransactionParticipants;
  product: TransactionProduct;
  amounts?: Partial<TransactionAmounts>; // Optional - will be calculated if not provided
  payments?: TransactionPayment[];
  metadata?: TransactionMetadata;
  notes?: string;
  transactionDate?: Date; // For backdated transactions - owners can set any date
  settlementDate?: Date; // When payments were actually settled
  idempotencyKey?: string; // To prevent duplicate transactions
}

export interface TransactionSummary {
  id: number;
  status: TransactionStatus;
  participants: TransactionParticipants;
  product: TransactionProduct;
  amounts: TransactionAmounts;
  paymentStatus: PaymentStatusSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStatusSummary {
  buyerPayments: {
    required: number;
    paid: number;
    pending: number;
    isComplete: boolean;
  };
  farmerPayments: {
    required: number;
    paid: number;
    pending: number;
    isComplete: boolean;
  };
}

export interface AuthorizedUser {
  id: number;
  role: string;
}

export interface TransactionFilters {
  shopId?: number;
  farmerId?: number;
  buyerId?: number;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CommissionConfiguration {
  rate: number;
  source: 'payload' | 'farmer_custom' | 'shop_default' | 'system_default';
}

export interface PaymentAllocation {
  id?: number;
  paymentId: number;
  transactionId: number;
  allocatedAmount: number;
  createdAt?: Date;
}

export interface TransactionLedgerEntry {
  id?: number;
  transactionId: number;
  userId: number;
  role: string;
  deltaAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  reasonCode: string;
  createdAt?: Date;
}

export interface BackdatedTransactionRequest extends CreateTransactionRequest {
  transactionDate: Date; // Required for backdated transactions
  paymentDate?: Date; // When payments were actually made (can be different from transaction date)
  isBackdated: boolean; // Flag to indicate this is a backdated transaction
}