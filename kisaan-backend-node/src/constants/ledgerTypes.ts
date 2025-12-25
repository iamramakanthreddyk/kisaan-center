// Centralized ledger types for simple farmer ledger
export const LEDGER_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;

export type LedgerType = 'credit' | 'debit';

export const LEDGER_TYPE_VALUES = ['credit', 'debit'] as const;
