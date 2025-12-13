import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { Receipt, Wallet, CreditCard, Settings } from 'lucide-react';

interface TransactionSettlementViewProps {
  transactionId: number;
}

export function TransactionSettlementView({ transactionId }: TransactionSettlementViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction-settlement', transactionId],
    queryFn: () => transactionsApi.getSettlement(transactionId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement Details</CardTitle>
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
          <CardTitle>Settlement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load settlement details</p>
        </CardContent>
      </Card>
    );
  }

  const settlement = data.data;
  const settlementPercent = settlement.total_amount > 0 
    ? Math.round((settlement.settled_amount / settlement.total_amount) * 100) 
    : 0;

  const getSettlementIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <Wallet className="w-4 h-4" />;
      case 'EXPENSE_OFFSET':
        return <Receipt className="w-4 h-4" />;
      case 'CREDIT_OFFSET':
        return <CreditCard className="w-4 h-4" />;
      case 'ADJUSTMENT':
        return <Settings className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSettlementTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Settlement Details</span>
          <Badge variant={settlement.settlement_status === 'FULLY_SETTLED' ? 'default' : settlement.settlement_status === 'PARTIALLY_SETTLED' ? 'secondary' : 'outline'}>
            {settlementPercent}% Settled
          </Badge>
        </CardTitle>
        <CardDescription>
          Track how this transaction has been settled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(settlement.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Settled</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(settlement.settled_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold text-orange-600">{formatCurrency(settlement.pending_amount)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${settlementPercent}%` }}
          />
        </div>

        {/* Settlement Breakdown */}
        {settlement.settlements && settlement.settlements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Settlement Breakdown</h4>
            <div className="space-y-2">
              {settlement.settlements.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    {getSettlementIcon(s.settlement_type)}
                    <div>
                      <p className="text-sm font-medium">{getSettlementTypeLabel(s.settlement_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.settled_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(s.amount)}</p>
                    {s.notes && (
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate">{s.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {settlement.settlements.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No settlements recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
