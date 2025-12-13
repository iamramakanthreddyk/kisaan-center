// Centralized transaction helpers for DRY logic
// Usage: import * as txnHelpers from './transactionHelpers';
import type { Transaction, User } from '../types/api';
import { getUserDisplayNameById } from './userDisplayName';

export function getBuyerName(users: User[], txn: Transaction): string {
  return getUserDisplayNameById(users, txn.buyer_id);
}

export function getFarmerName(users: User[], txn: Transaction): string {
  return getUserDisplayNameById(users, txn.farmer_id);
}

export function getShopName(users: User[], txn: Transaction): string {
  return getUserDisplayNameById(users, txn.shop_id);
}

export function getTotalSaleValue(txn: Transaction): number {
  if (typeof txn.total_amount === 'number') return txn.total_amount;
  return 0;
}

export function getBuyerPaid(txn: Transaction): number {
  if (typeof txn.buyer_paid === 'number') return txn.buyer_paid;
  if (Array.isArray(txn.payments)) {
    return txn.payments
      .filter(p => String(p.payer_type || '').toUpperCase() === 'BUYER')
      .reduce((sum, p) => sum + (isNaN(Number(p.amount)) ? 0 : Number(p.amount)), 0);
  }
  return 0;
}

export function getFarmerPaid(txn: Transaction): number {
  if (typeof txn.farmer_paid === 'number') return txn.farmer_paid;
  if (Array.isArray(txn.payments)) {
    return txn.payments
      .filter(p => String(p.payee_type || '').toUpperCase() === 'FARMER')
      .reduce((sum, p) => sum + (isNaN(Number(p.amount)) ? 0 : Number(p.amount)), 0);
  }
  return 0;
}

export function getFarmerDue(txn: Transaction): number {
  if (typeof txn.farmer_due === 'number') return txn.farmer_due;
  const earning = typeof txn.farmer_earning === 'number' ? txn.farmer_earning : 0;
  return earning - getFarmerPaid(txn);
}
