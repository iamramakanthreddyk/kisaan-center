import { PaymentStatus as PaymentStatusEnum, PaymentMethod as PaymentMethodEnum, PaymentParty as PaymentPartyEnum } from '../shared/enums';

// Re-export for backward compatibility
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] as const;
export const PAYMENT_UPDATE_STATUSES = ['PAID', 'FAILED', 'CANCELLED'] as const;
export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER'] as const;
export const PAYMENT_PAYER_TYPES = ['BUYER', 'SHOP', 'FARMER', 'EXTERNAL'] as const;
export const PAYMENT_PAYEE_TYPES = ['BUYER', 'SHOP', 'FARMER', 'EXTERNAL'] as const;

export type PaymentPayerType = typeof PAYMENT_PAYER_TYPES[number];
export type PaymentPayeeType = typeof PAYMENT_PAYEE_TYPES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type PaymentUpdateStatus = typeof PAYMENT_UPDATE_STATUSES[number];

// New centralized enum exports
export { PaymentStatusEnum, PaymentMethodEnum, PaymentPartyEnum };