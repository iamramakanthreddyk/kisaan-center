import React from 'react';
import { ArrowUp, ArrowDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BalanceCardProps {
  userName: string;
  userRole: 'farmer' | 'buyer' | 'shop_owner';
  balance: number;
  lastUpdated?: Date;
  showDetails?: boolean;
  className?: string;
}

/**
 * BalanceCard Component
 * Displays user balance with clear visual indicators based on ledger system
 * 
 * Balance Interpretation:
 * - Farmer with positive balance: Shop OWES money to farmer (farmer has earned)
 * - Buyer with positive balance: Buyer OWES money to shop (buyer has outstanding debt)
 * - Negative balance: Opposite meaning
 */
export const BalanceCard: React.FC<BalanceCardProps> = ({
  userName,
  userRole,
  balance,
  lastUpdated,
  showDetails = true,
  className = ''
}) => {
  const isPositive = balance >= 0;
  const absBalance = Math.abs(balance);

  // Determine status and message based on role and balance
  const getStatusInfo = () => {
    if (userRole === 'farmer') {
      return isPositive
        ? {
            title: 'Amount Shop Owes',
            subtitle: `Farmer has earned ₹${absBalance.toLocaleString()}`,
            icon: <ArrowUp className="h-5 w-5" />,
            color: 'bg-green-50 border-green-200',
            textColor: 'text-green-700',
            badgeColor: 'bg-green-100 text-green-800',
            statusIcon: <CheckCircle className="h-4 w-4 text-green-600" />
          }
        : {
            title: 'Amount Farmer Owes',
            subtitle: `Farmer has outstanding debt of ₹${absBalance.toLocaleString()}`,
            icon: <ArrowDown className="h-5 w-5" />,
            color: 'bg-red-50 border-red-200',
            textColor: 'text-red-700',
            badgeColor: 'bg-red-100 text-red-800',
            statusIcon: <AlertCircle className="h-4 w-4 text-red-600" />
          };
    } else if (userRole === 'buyer') {
      return isPositive
        ? {
            title: 'Amount Buyer Owes',
            subtitle: `Buyer has outstanding debt of ₹${absBalance.toLocaleString()}`,
            icon: <ArrowUp className="h-5 w-5" />,
            color: 'bg-orange-50 border-orange-200',
            textColor: 'text-orange-700',
            badgeColor: 'bg-orange-100 text-orange-800',
            statusIcon: <AlertCircle className="h-4 w-4 text-orange-600" />
          }
        : {
            title: 'Credit with Buyer',
            subtitle: `Shop has credit of ₹${absBalance.toLocaleString()}`,
            icon: <ArrowDown className="h-5 w-5" />,
            color: 'bg-blue-50 border-blue-200',
            textColor: 'text-blue-700',
            badgeColor: 'bg-blue-100 text-blue-800',
            statusIcon: <CheckCircle className="h-4 w-4 text-blue-600" />
          };
    }
    // shop_owner
    return {
      title: 'Net Balance',
      subtitle: isPositive ? 'Shop has receivables' : 'Shop has payables',
      icon: isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />,
      color: isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
      textColor: isPositive ? 'text-green-700' : 'text-red-700',
      badgeColor: isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      statusIcon: isPositive 
        ? <CheckCircle className="h-4 w-4 text-green-600" />
        : <AlertCircle className="h-4 w-4 text-red-600" />
    };
  };

  const status = getStatusInfo();

  return (
    <Card className={`border-2 ${status.color} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Icon and info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={status.textColor}>{status.icon}</span>
              <h3 className="text-sm font-medium text-gray-700">{status.title}</h3>
              {status.statusIcon}
            </div>
            
            <p className="text-3xl font-bold mb-2">
              <span className={status.textColor}>
                ₹{absBalance.toLocaleString()}
              </span>
            </p>
            
            <p className="text-sm text-gray-600 mb-3">{status.subtitle}</p>
            
            {showDetails && (
              <div className="space-y-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">User:</span> {userName}
                </div>
                <div>
                  <span className="font-medium">Role:</span> {userRole.replace('_', ' ').toLowerCase()}
                </div>
                {lastUpdated && (
                  <div>
                    <span className="font-medium">Last Updated:</span> {lastUpdated.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side: Status badge */}
          <div className={`px-3 py-2 rounded-full ${status.badgeColor} font-semibold text-sm whitespace-nowrap`}>
            {isPositive ? 'Debt' : 'Credit'}
          </div>
        </div>

        {/* Ledger system note */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <p>💡 <strong>Ledger-based calculation:</strong> Accurate balance from transaction ledger</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
