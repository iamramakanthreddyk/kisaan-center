import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, Eye } from 'lucide-react';
import type { Transaction } from '../../types/api';
import { formatCurrency } from '@/utils/format';

interface PendingActionsProps {
  pendingTransactions: Transaction[];
  isLoading?: boolean;
  onViewTransaction?: (id: number) => void;
}

// Use global formatCurrency utility for all currency display

export const PendingActions: React.FC<PendingActionsProps> = ({ 
  pendingTransactions, 
  isLoading,
  onViewTransaction 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-5 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter transactions by type
  const collectionsDue = pendingTransactions.filter(t => 
  t.status === 'pending' && t.total_amount > 0
  );
  
  const farmerPaymentsDue = pendingTransactions.filter(t => 
    t.status === 'completed' && t.farmer_earning > 0
  );

  const renderTransactionCard = (
    title: string,
    transactions: Transaction[],
    icon: React.ElementType,
    colorClass: string,
    bgColorClass: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center ${colorClass}`}>
          {React.createElement(icon, { className: 'w-5 h-5 mr-2' })}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(transaction => (
            <div key={transaction.id} className={`flex justify-between items-center p-3 ${bgColorClass} rounded-lg`}>
              <div>
                <p className="font-medium">{transaction.product_name}</p>
                <p className="text-sm text-gray-600">
                  Qty: {transaction.quantity} @ ₹{transaction.unit_price}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(transaction.transaction_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className={`font-bold ${colorClass}`}>
                    {formatCurrency(
                      title.includes('Collection') 
                        ? transaction.total_amount 
                        : transaction.farmer_earning
                    )}
                  </p>
                  <Badge variant={transaction.status === 'pending' ? 'destructive' : 'secondary'}>
                    {transaction.status}
                  </Badge>
                </div>
                {onViewTransaction && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewTransaction(transaction.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No {title.toLowerCase()}
            </p>
          )}
          {transactions.length > 5 && (
            <p className="text-center text-sm text-gray-500">
              +{transactions.length - 5} more items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderTransactionCard(
        'Collections Due',
        collectionsDue,
        AlertCircle,
        'text-orange-600',
        'bg-orange-50'
      )}
      {renderTransactionCard(
        'Farmer Payments Due',
        farmerPaymentsDue,
        Users,
        'text-red-600',
        'bg-red-50'
      )}
    </div>
  );
};