import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import { formatCurrency } from '../utils/format';
import { Loader2 } from 'lucide-react';

interface OffsetExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: number;
  transactionTotal: number;
  transactionPending: number;
  expenseId?: number;
  expenseAmount?: number;
}

export function OffsetExpenseDialog({
  open,
  onOpenChange,
  transactionId,
  transactionTotal,
  transactionPending,
  expenseId: initialExpenseId,
  expenseAmount: initialExpenseAmount,
}: OffsetExpenseDialogProps) {
  const [expenseId, setExpenseId] = useState(initialExpenseId?.toString() || '');
  const [amount, setAmount] = useState(initialExpenseAmount?.toString() || '');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const offsetMutation = useMutation({
    mutationFn: (data: { expense_id: number; amount: number; notes?: string }) =>
      transactionsApi.offsetExpense(transactionId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Expense offset against transaction successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['transaction-settlement', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to offset expense',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    if (!initialExpenseId) setExpenseId('');
    if (!initialExpenseAmount) setAmount('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseIdNum = parseInt(expenseId);
    const amountNum = parseFloat(amount);

    if (!expenseIdNum || isNaN(expenseIdNum) || expenseIdNum <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid expense ID',
        variant: 'destructive',
      });
      return;
    }

    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (amountNum > transactionPending) {
      toast({
        title: 'Validation Error',
        description: `Amount cannot exceed pending transaction amount (${formatCurrency(transactionPending)})`,
        variant: 'destructive',
      });
      return;
    }

    offsetMutation.mutate({
      expense_id: expenseIdNum,
      amount: amountNum,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Offset Expense Against Transaction</DialogTitle>
          <DialogDescription>
            Settle an expense or advance by offsetting it against this transaction's pending amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Transaction Total</Label>
                <p className="text-lg font-semibold">{formatCurrency(transactionTotal)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Pending Amount</Label>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(transactionPending)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-id">Expense ID *</Label>
              <Input
                id="expense-id"
                type="number"
                placeholder="Enter expense ID"
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
                disabled={offsetMutation.isPending || !!initialExpenseId}
                required
              />
              <p className="text-xs text-muted-foreground">
                The ID of the expense/advance to offset
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Offset *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={offsetMutation.isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Max: {formatCurrency(transactionPending)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this offset..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={offsetMutation.isPending}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={offsetMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={offsetMutation.isPending}>
              {offsetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Offset Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
