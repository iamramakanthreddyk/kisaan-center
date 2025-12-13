import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatCurrency } from '../../lib/formatters';

interface FarmerSummary {
  id: number;
  username: string;
  total_sales?: number;
  total_paid?: number;
  outstanding?: number;
}

interface FarmerSummaryListProps {
  farmers: FarmerSummary[];
  onSelect: (farmer: FarmerSummary) => void;
}

export const FarmerSummaryList: React.FC<FarmerSummaryListProps> = ({ farmers, onSelect }) => {
  return (
    <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {farmers.map(farmer => (
        <Card key={farmer.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(farmer)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{farmer.username}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">Total Sales: {formatCurrency(farmer.total_sales || 0)}</div>
            <div className="text-sm">Total Paid: {formatCurrency(farmer.total_paid || 0)}</div>
            <div className="text-sm text-red-600">Outstanding: {formatCurrency(farmer.outstanding || 0)}</div>
            <Button size="sm" className="mt-2 w-full">View Details</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
