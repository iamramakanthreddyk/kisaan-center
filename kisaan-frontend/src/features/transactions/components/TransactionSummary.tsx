import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
  total_sale_value: number;
  shop_commission: number;
  farmer_earning: number;
  commissionRate: number; // decimal (0.10)
  onCommissionRateChange: (rateDecimal: number) => void;
  formatCurrency: (n: number) => string;
  expenseAmount?: number;
  expenseDescription?: string;
}

export const TransactionSummary: React.FC<Props> = ({ total_sale_value, shop_commission, farmer_earning, commissionRate, onCommissionRateChange, formatCurrency, expenseAmount = 0, expenseDescription }) => {
  const netFarmerEarning = farmer_earning - expenseAmount;
  
  return (
    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2">
      <h4 className="font-medium text-gray-900">Transaction Summary</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Sale Value</p>
          <p className="font-semibold text-lg">{formatCurrency(total_sale_value)}</p>
        </div>
        <div>
          <p className="text-gray-600">Shop Commission</p>
          <p className="font-semibold text-lg text-green-600">{formatCurrency(shop_commission)}</p>
        </div>
        <div>
          <p className="text-gray-600">Farmer Earning (before expense)</p>
          <p className="font-semibold text-lg text-blue-600">{formatCurrency(farmer_earning)}</p>
        </div>
      </div>
      
      {expenseAmount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm mt-2 pt-2 border-t border-gray-200">
          <div>
            <p className="text-gray-600">Expense Deduction</p>
            <p className="font-semibold text-lg text-red-600">-{formatCurrency(expenseAmount)}</p>
            {expenseDescription && (
              <p className="text-xs text-gray-500 italic">{expenseDescription}</p>
            )}
          </div>
          <div>
            <p className="text-gray-600">Net Farmer Payment</p>
            <p className="font-semibold text-lg text-blue-700">{formatCurrency(netFarmerEarning)}</p>
          </div>
        </div>
      )}
      
      <div className="mt-2">
        <Label htmlFor="commissionRate">Shop Commission Rate (%)</Label>
        <Input
          id="commissionRate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={(commissionRate * 100).toString()}
          onChange={e => {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val < 0) val = 0;
            if (val > 100) val = 100;
            onCommissionRateChange(val / 100);
          }}
          className="text-sm w-32"
        />
        <p className="text-xs text-gray-500">You can change the commission rate for this transaction.</p>
      </div>
    </div>
  );
};
