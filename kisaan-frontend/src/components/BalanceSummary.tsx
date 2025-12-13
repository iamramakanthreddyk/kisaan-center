import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BalanceSummaryProps {
  totalReceivables: number;
  totalPayables: number;
  totalUsers: number;
  farmersCount: number;
  buyersCount: number;
}

/**
 * BalanceSummary Component
 * Shows high-level overview of all balances in the system
 * Using ledger-based calculations for accuracy
 */
export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  totalReceivables,
  totalPayables,
  totalUsers,
  farmersCount,
  buyersCount
}) => {
  const netBalance = totalReceivables - totalPayables;
  const isPositive = netBalance >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Receivables Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Receivables (from Buyers)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{totalReceivables.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Amount buyers owe to shop
              </p>
            </div>
            <TrendingDown className="h-6 w-6 text-blue-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Payables Card */}
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Payables (to Farmers)
              </p>
              <p className="text-2xl font-bold text-red-600">
                ₹{totalPayables.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Amount shop owes to farmers
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-red-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Net Position Card */}
      <Card className={`border-l-4 ${isPositive ? 'border-l-green-500' : 'border-l-orange-500'}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Net Position
              </p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                ₹{Math.abs(netBalance).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {isPositive ? '✓ Shop has net receivables' : '⚠ Shop has net payables'}
              </p>
            </div>
            {isPositive ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Count Card */}
      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Users
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {totalUsers}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {farmersCount} farmers, {buyersCount} buyers
              </p>
            </div>
            <Users className="h-6 w-6 text-purple-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSummary;
