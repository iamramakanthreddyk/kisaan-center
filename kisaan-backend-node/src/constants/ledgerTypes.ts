// Centralized ledger types for simple farmer ledger
export const LEDGER_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;

export type LedgerType = typeof LEDGER_TYPES[keyof typeof LEDGER_TYPES];

export const LEDGER_TYPE_VALUES = Object.values(LEDGER_TYPES);
