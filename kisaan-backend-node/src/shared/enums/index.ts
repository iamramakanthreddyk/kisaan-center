/**
 * CENTRALIZED ENUM DEFINITIONS
 * Single source of truth for all enums used across the application
 * DO NOT define enums in multiple places - always import from here
 */

export enum PaymentParty {
  Buyer = 'BUYER',
  Shop = 'SHOP',
  Farmer = 'FARMER',
  External = 'EXTERNAL',
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export enum PaymentMethod {
  Cash = 'CASH',
  Upi = 'UPI',
  BankTransfer = 'BANK_TRANSFER',
  Card = 'CARD',
  Cheque = 'CHEQUE',
  Other = 'OTHER',
}

export enum SettlementType {
  Partial = 'partial',
  Full = 'full',
  Advance = 'advance',
  Adjustment = 'adjustment',
}

export enum TransactionStatus {
  Pending = 'PENDING',
  PartiallyPaid = 'PARTIALLY_PAID',
  Settled = 'SETTLED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export enum UserRole {
  Superadmin = 'superadmin',
  Owner = 'owner',
  Farmer = 'farmer',
  Buyer = 'buyer',
  Employee = 'employee',
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
}

export enum ProductStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum ShopStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum PlanStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum SettlementReason {
  Overpayment = 'overpayment',
  Underpayment = 'underpayment',
  Adjustment = 'adjustment',
  Expense = 'expense',
  Advance = 'advance',
}

export enum SettlementStatus {
  Pending = 'pending',
  Settled = 'settled',
}

export enum ExpenseStatus {
  Pending = 'pending',
  Settled = 'settled',
}

export enum ExpenseCategory {
  Transport = 'transport',
  Packaging = 'packaging',
  Labor = 'labor',
  Storage = 'storage',
  Misc = 'misc',
}

export enum BalanceType {
  Farmer = 'farmer',
  Buyer = 'buyer',
}

// Type exports for backward compatibility
export type PaymentPartyType = PaymentParty;
export type PaymentStatusType = PaymentStatus;
export type PaymentMethodType = PaymentMethod;
export type TransactionStatusType = TransactionStatus;
export type UserRoleType = UserRole;
export type UserStatusType = UserStatus;
export type ProductStatusType = ProductStatus;
export type ShopStatusType = ShopStatus;
export type PlanStatusType = PlanStatus;
export type SettlementReasonType = SettlementReason;
export type SettlementStatusType = SettlementStatus;
export type ExpenseStatusType = ExpenseStatus;
export type ExpenseCategoryType = ExpenseCategory;
export type BalanceTypeType = BalanceType;