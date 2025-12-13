import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ArrowRightLeft, Wallet, CreditCard } from 'lucide-react';

interface ExpenseAllocationViewProps {
  expenseId: number;
}

export function ExpenseAllocationView({ expenseId }: ExpenseAllocationViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['expense-allocation', expenseId],
    queryFn: () => expenseApi.getAllocation(expenseId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load allocation details</p>
        </CardContent>
      </Card>
    );
  }

  const allocation = data.data;
  const allocationPercent = allocation.total_amount > 0 
    ? Math.round((allocation.allocated_amount / allocation.total_amount) * 100) 
    : 0;

  const getAllocationIcon = (type: string) => {
    switch (type) {
      case 'TRANSACTION_OFFSET':
        return <ArrowRightLeft className="w-4 h-4" />;
      case 'BALANCE_SETTLEMENT':
        return <Wallet className="w-4 h-4" />;
      case 'ADVANCE_PAYMENT':
        return <CreditCard className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getAllocationTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Allocation Details</span>
          <Badge variant={allocation.allocation_status === 'FULLY_ALLOCATED' ? 'default' : allocation.allocation_status === 'PARTIALLY_ALLOCATED' ? 'secondary' : 'outline'}>
            {allocationPercent}% Allocated
          </Badge>
        </CardTitle>
        <CardDescription>
          Track how this expense has been allocated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(allocation.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Allocated</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(allocation.allocated_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold text-orange-600">{formatCurrency(allocation.remaining_amount)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${allocationPercent}%` }}
          />
        </div>

        {/* Allocation Breakdown */}
        {allocation.allocations && allocation.allocations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Allocation Breakdown</h4>
            <div className="space-y-2">
              {allocation.allocations.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    {getAllocationIcon(a.allocation_type)}
                    <div>
                      <p className="text-sm font-medium">{getAllocationTypeLabel(a.allocation_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.allocation_date), 'MMM dd, yyyy')}
                        {a.transaction_id && ` • Txn #${a.transaction_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(a.allocated_amount)}</p>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate">{a.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allocation.allocations.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No allocations recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
