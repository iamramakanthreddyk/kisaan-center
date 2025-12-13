// Centralized ledger categories for simple farmer ledger
export const LEDGER_CATEGORIES = {
  SALE: 'sale',
  EXPENSE: 'expense',
  WITHDRAWAL: 'withdrawal',
  OTHER: 'other',
} as const;

export type LedgerCategory = typeof LEDGER_CATEGORIES[keyof typeof LEDGER_CATEGORIES];

export const LEDGER_CATEGORY_VALUES = Object.values(LEDGER_CATEGORIES);
