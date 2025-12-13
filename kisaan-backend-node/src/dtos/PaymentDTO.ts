import { PaymentPayerType, PaymentPayeeType, PaymentMethod, PaymentStatus } from '../constants/payment';

export interface CreatePaymentDTO {
  transaction_id?: number; // Optional for advance payments
  payer_type: PaymentPayerType;
  payee_type: PaymentPayeeType;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  notes?: string;
  counterparty_id?: number; // Required for direct/advance payments (farmer or buyer)
  shop_id?: number; // Optional, for direct/advance payments to associate with a shop
  payment_date?: string | Date; // Allow backdated payment timestamps from payload
  force_override?: boolean; // Optional flag to allow force-recording payments that worsen balances
}

// For bulk payments
export interface BulkPaymentItemDTO {
  transaction_id: number;
  amount: number;
}

export interface BulkPaymentDTO {
  payments: BulkPaymentItemDTO[];
  payer_type: PaymentPayerType;
  payee_type: PaymentPayeeType;
  method: PaymentMethod;
  status?: PaymentStatus;
  notes?: string;
}

export interface PaymentResponseDTO {
  id: number;
  transaction_id: number;
  payer_type: PaymentPayerType;
  payee_type: PaymentPayeeType;
  amount: number;
  status: PaymentStatus;
  payment_date?: Date;
  method: PaymentMethod;
  notes?: string;
  created_at: Date;
}

export interface UpdatePaymentStatusDTO {
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payment_date?: Date;
  notes?: string;
}