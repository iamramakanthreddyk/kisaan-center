// Centralized ledger categories for simple farmer ledger
export const LEDGER_CATEGORIES = {
  SALE: 'sale',
  DEPOSIT: 'deposit',
  EXPENSE: 'expense',
  WITHDRAWAL: 'withdrawal',
  LOAN: 'loan',
  OTHER: 'other',
} as const;

export type LedgerCategory = 'sale' | 'deposit' | 'expense' | 'withdrawal' | 'loan' | 'other';

// Categories organized by ledger type
export const CREDIT_CATEGORIES = [
  LEDGER_CATEGORIES.SALE,
  LEDGER_CATEGORIES.DEPOSIT,
  LEDGER_CATEGORIES.OTHER,
];

export const DEBIT_CATEGORIES = [
  LEDGER_CATEGORIES.EXPENSE,
  LEDGER_CATEGORIES.WITHDRAWAL,
  LEDGER_CATEGORIES.LOAN,
  LEDGER_CATEGORIES.OTHER,
];

export const LEDGER_CATEGORY_VALUES = [
  'sale', 'deposit', 'expense', 'withdrawal', 'loan', 'other'
] as const;
