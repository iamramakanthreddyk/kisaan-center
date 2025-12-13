import { TransactionEntity } from '../entities/TransactionEntity';
import { TransactionStatus } from '../shared/constants/index';

export interface TransactionStatusDetails {
  transaction: TransactionEntity;
  paymentAnalysis: {
    buyerPayments: {
      total: number;
      paid: number;
      pending: number;
      failed: number;
      isFullyPaid: boolean;
      isPartiallyPaid: boolean;
      isOverpaid: boolean;
    };
    farmerPayments: {
      total: number;
      paid: number;
      pending: number;
      failed: number;
      isFullyPaid: boolean;
      isPartiallyPaid: boolean;
      isOverpaid: boolean;
    };
  };
  financialValidation: {
    isBalanced: boolean;
    expectedCommission: number;
    actualCommission: number;
    discrepancy: number;
  };
  statusRecommendation: TransactionStatus;
  commissionConfirmed: boolean;
}