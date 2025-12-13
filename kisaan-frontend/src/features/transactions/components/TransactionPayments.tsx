import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';

interface PaymentState {
  buyerPaid: number;
  farmerPaid: number;
  commissionReceived: number;
  commissionRate: number;
  buyerPaymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
  farmerPaymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
}

interface TransactionSummary {
  totalSaleValue: number;
  shopCommission: number;
  farmerEarning: number;
  expenseAmount?: number;
}

interface Props extends PaymentState {
  onChange: (patch: Partial<PaymentState>) => void;
  showValidationErrors: boolean;
  transactionSummary: TransactionSummary;
}

export const TransactionPayments: React.FC<Props> = ({ buyerPaid, farmerPaid, commissionReceived, buyerPaymentMethod, farmerPaymentMethod, onChange, showValidationErrors, transactionSummary }) => {
  // Handler for commission rate input (percent to decimal)
  const handleCommissionRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const decimal = percent / 100;
    onChange({ commissionRate: decimal });
  };
  const safeSummary = transactionSummary || { totalSaleValue: 0, shopCommission: 0, farmerEarning: 0, expenseAmount: 0 };
  const totalSaleValue = safeSummary.totalSaleValue;
  const expenseAmount = safeSummary.expenseAmount || 0;
  const maxFarmerPayment = safeSummary.farmerEarning - expenseAmount; // Deduct expense from farmer earning
  const maxCommission = safeSummary.shopCommission;
  // Calculate pending balances
  const buyerPending = Math.max(0, totalSaleValue - buyerPaid);
  const farmerPending = Math.max(0, maxFarmerPayment - farmerPaid);
  // Smart payment validation logic
  const buyerAmountError = totalSaleValue > 0 && buyerPaid > totalSaleValue;
  // Farmer payment should not exceed earning
  const farmerAmountError = maxFarmerPayment > 0 && farmerPaid > maxFarmerPayment;
  // Commission should be positive and not exceed calculated commission
  const commissionError = commissionReceived > maxCommission || commissionReceived < 0 || (maxCommission > 0 && Math.abs(commissionReceived - maxCommission) > 0.01);
  
  // Debug values
  console.log('Debug Values:', {
    totalSaleValue,
    maxFarmerPayment,
    buyerPaid,
    farmerPaid,
    safeSummary
  });

  // Smart buyer payment status
  let buyerPaymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  if (buyerPaid === 0) {
    buyerPaymentStatus = 'PENDING';
  } else if (totalSaleValue > 0 && Number(buyerPaid) >= Number(totalSaleValue)) {
    buyerPaymentStatus = 'PAID';
  } else if (totalSaleValue > 0 && buyerPaid > 0) {
    buyerPaymentStatus = 'PARTIAL';
  } else {
    buyerPaymentStatus = 'PENDING';
  }
  
  // Smart farmer payment status  
  let farmerPaymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  if (farmerPaid === 0) {
    farmerPaymentStatus = 'PENDING';
  } else if (maxFarmerPayment > 0 && Number(farmerPaid) >= Number(maxFarmerPayment)) {
    farmerPaymentStatus = 'PAID';
  } else if (maxFarmerPayment > 0 && farmerPaid > 0) {
    farmerPaymentStatus = 'PARTIAL';
  } else {
    farmerPaymentStatus = 'PENDING';
  }

  console.log('Status Results:', {
    buyerPaymentStatus,
    farmerPaymentStatus,
    buyerComparison: `${buyerPaid} >= ${totalSaleValue} = ${Number(buyerPaid) >= Number(totalSaleValue)}`,
    farmerComparison: `${farmerPaid} >= ${maxFarmerPayment} = ${Number(farmerPaid) >= Number(maxFarmerPayment)}`
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mt-4">
      <div>
  <Label>Buyer Paid (to Shop)</Label>
  <div className="text-xs text-gray-600 mb-1">Pending: ₹{buyerPending.toFixed(2)}</div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={buyerPaid === 0 ? '' : buyerPaid}
            onChange={e => {
              const value = e.target.value === '' ? 0 : Math.max(0, Number(Number(e.target.value).toFixed(2)));
              onChange({ buyerPaid: value });
            }}
            className="text-sm"
          />
          <StatusBadge status={(buyerPaymentStatus.toLowerCase() as 'pending' | 'partial' | 'paid')} />
        </div>
        {showValidationErrors && buyerAmountError && (
          <span className="text-xs text-red-500">Buyer payment cannot exceed {totalSaleValue.toFixed(2)} (Total Sale Value)</span>
        )}
        <Label className="mt-1">Buyer → Shop Payment Method</Label>
        <select
          className="block w-full border rounded p-2 text-xs sm:text-sm mt-1"
          value={buyerPaymentMethod}
          onChange={e => onChange({ buyerPaymentMethod: e.target.value as 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other' })}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
  <Label>Farmer Paid (by Shop)</Label>
  <div className="text-xs text-gray-600 mb-1">Pending: ₹{farmerPending.toFixed(2)}</div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={farmerPaid === 0 ? '' : farmerPaid}
            onChange={e => {
              const value = e.target.value === '' ? 0 : Math.max(0, Number(Number(e.target.value).toFixed(2)));
              onChange({ farmerPaid: value });
            }}
            className="text-sm"
          />
          <StatusBadge status={(farmerPaymentStatus.toLowerCase() as 'pending' | 'partial' | 'paid')} />
        </div>
        {showValidationErrors && farmerAmountError && (
          <span className="text-xs text-red-500">Farmer payment cannot exceed {maxFarmerPayment.toFixed(2)} (Farmer Earning)</span>
        )}
        <Label className="mt-1">Shop → Farmer Payment Method</Label>
        <select
          className="block w-full border rounded p-2 text-xs sm:text-sm mt-1"
          value={farmerPaymentMethod}
          onChange={e => onChange({ farmerPaymentMethod: e.target.value as 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other' })}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <Label>Shop Commission Rate (%)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={((transactionSummary.shopCommission / transactionSummary.totalSaleValue) * 100).toFixed(2)}
          onChange={handleCommissionRateChange}
          className="text-sm"
        />
        <Label>Commission Received</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={commissionReceived === 0 ? '' : commissionReceived}
          onChange={e => {
            const value = e.target.value === '' ? 0 : Math.max(0, Number(Number(e.target.value).toFixed(2)));
            onChange({ commissionReceived: value });
          }}
          className="text-sm"
        />
        {showValidationErrors && commissionError && (
          <span className="text-xs text-red-500">Commission must be positive and exactly {maxCommission.toFixed(2)} (10% of Sale Value)</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 md:col-span-2">You can edit payment values and methods before creating the transaction.</p>
    </div>
  );
};
