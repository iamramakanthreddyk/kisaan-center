/**
 * ExpenseEntity - Domain Entity for Standalone Expenses
 * Represents expenses not tied to specific transactions
 */
export class ExpenseEntity {
  id?: number;
  user_id?: number;
  amount?: number;
  expense_date?: Date;
  description?: string;
  category?: 'transport' | 'packaging' | 'labor' | 'storage' | 'misc' | null;
  ledger_entry_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number | null;
  deleted_at?: Date | null;

  constructor(init?: Partial<ExpenseEntity>) {
    Object.assign(this, init);
  }
}
