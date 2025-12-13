import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

interface ExpenseSummaryCardProps {
  totalExpenses: number;
  netEarnings: number;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

const ExpenseSummaryCard: React.FC<ExpenseSummaryCardProps> = ({ totalExpenses, netEarnings }) => (
  <Card>
    <CardHeader>
      <CardTitle>Expense Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-2">
        <div><strong>Total Expenses:</strong> {formatCurrency(totalExpenses)}</div>
        <div><strong>Net Earnings:</strong> {formatCurrency(netEarnings)}</div>
      </div>
    </CardContent>
  </Card>
);

export default ExpenseSummaryCard;