import React from 'react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { UserSearchDropdown } from '../../components/ui/UserSearchDropdown';

interface ExpenseFormProps {
  expenseForm: {
    reason: string;
    userId: string;
    amount: string;
    description: string;
  };
  setExpenseForm: React.Dispatch<React.SetStateAction<{
    reason: string;
    userId: string;
    amount: string;
    description: string;
  }>>;
  handleAddExpense: () => void;
  isLoading: boolean;
  // users and usersLoading props are no longer needed
  reasons: Array<{ value: string; label: string }>;
  storeShop: { id?: string | number } | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expenseForm,
  setExpenseForm,
  handleAddExpense,
  isLoading,
  reasons,
  storeShop
}) => (
  <>
    <div>
      <Label htmlFor="expenseReason">Reason</Label>
      <select
        id="expenseReason"
        value={expenseForm.reason}
        onChange={e => setExpenseForm(f => ({ ...f, reason: e.target.value }))}
        className="w-full border rounded px-2 py-1"
        disabled={isLoading}
      >
        <option value="">Select reason</option>
        {reasons.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
    <div>
      <Label htmlFor="expenseUser">User</Label>
      <UserSearchDropdown
        onSelect={user => {
          if (user) {
            setExpenseForm(f => ({ ...f, userId: String(user.id) }));
          } else {
            setExpenseForm(f => ({ ...f, userId: '' }));
          }
        }}
        placeholder="Search user..."
      />
    </div>
    <div>
      <Label htmlFor="expenseAmount">Amount</Label>
      <Input
        id="expenseAmount"
        type="number"
        placeholder="Enter expense amount"
        value={expenseForm.amount}
        onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
      />
    </div>
    <div>
      <Label htmlFor="expenseDescription">Description</Label>
      <Input
        id="expenseDescription"
        placeholder="Enter expense description"
        value={expenseForm.description}
        onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
      />
    </div>
    <Button onClick={handleAddExpense} aria-label="Add Expense" disabled={!expenseForm.amount || !expenseForm.description || !expenseForm.userId || !expenseForm.reason || isLoading || !storeShop?.id}>
      {isLoading ? 'Adding...' : 'Add Expense'}
    </Button>
  </>
);

export default ExpenseForm;