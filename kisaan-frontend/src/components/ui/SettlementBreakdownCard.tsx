import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface FifoSettlement {
  expense_id: number;
  amount_settled: number;
  expense_date?: string;
  reason?: string;
}

interface SettlementBreakdown {
  applied_to_expenses: number;
  applied_to_balance: number;
  fifo_result?: {
    settlements?: FifoSettlement[];
    remaining?: number;
  };
}

interface SettlementBreakdownCardProps {
  settlementBreakdown: SettlementBreakdown;
  title?: string;
}

export const SettlementBreakdownCard: React.FC<SettlementBreakdownCardProps> = ({
  settlementBreakdown,
  title = "✅ Payment Recorded Successfully"
}) => {
  const totalPayment = settlementBreakdown.applied_to_expenses + settlementBreakdown.applied_to_balance;
  
  return (
    <Card className="mt-4 border-2 border-green-300 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-800 flex items-center gap-2">
          <span className="text-xl">💰</span>
          {title}
        </CardTitle>
        <div className="text-sm text-green-700 font-medium">
          Total Payment: ₹{totalPayment.toLocaleString()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Show how payment was applied */}
          <div className="bg-white rounded-lg border border-green-200 p-3">
            <div className="text-sm font-semibold text-gray-700 mb-3">How This Payment Was Applied:</div>
            <div className="space-y-2">
              {settlementBreakdown.applied_to_expenses > 0 && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded p-3">
                  <div>
                    <div className="text-sm font-medium text-orange-800">🧾 Step 1: Settled Expenses (FIFO)</div>
                    <div className="text-xs text-orange-600">Paid outstanding expenses oldest first</div>
                  </div>
                  <div className="text-xl font-bold text-orange-800">
                    ₹{settlementBreakdown.applied_to_expenses.toLocaleString()}
                  </div>
                </div>
              )}
              {settlementBreakdown.applied_to_balance > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-3">
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      {settlementBreakdown.applied_to_expenses > 0 ? '💳 Step 2: Adjusted Balance' : '💳 Applied to Balance'}
                    </div>
                    <div className="text-xs text-blue-600">
                      {settlementBreakdown.applied_to_expenses > 0 ? 'Remaining amount adjusted user balance' : 'Full amount adjusted user balance'}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-blue-800">
                    ₹{settlementBreakdown.applied_to_balance.toLocaleString()}
                  </div>
                </div>
              )}
              {settlementBreakdown.applied_to_expenses === 0 && settlementBreakdown.applied_to_balance === 0 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No breakdown available
                </div>
              )}
            </div>
          </div>
          {/* Detailed FIFO breakdown if available */}
          {settlementBreakdown.fifo_result && 
           Array.isArray(settlementBreakdown.fifo_result.settlements) && 
           settlementBreakdown.fifo_result.settlements.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <span className="text-base">📋</span>
                Detailed Expense Settlement (Oldest First)
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {settlementBreakdown.fifo_result.settlements.map((settlement, index) => (
                  <div key={index} className="bg-white rounded border border-amber-200 p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-700">Expense #{settlement.expense_id}</span>
                      <span className="font-bold text-orange-700">₹{settlement.amount_settled?.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-600 space-y-0.5">
                      <div>📅 Date: {settlement.expense_date ? new Date(settlement.expense_date).toLocaleDateString() : 'N/A'}</div>
                      <div>📝 Reason: {settlement.reason || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
              {settlementBreakdown.fifo_result.remaining && settlementBreakdown.fifo_result.remaining > 0 && (
                <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">✅ After settling all expenses, remaining amount:</span>
                    <span className="font-bold text-blue-800">₹{settlementBreakdown.fifo_result.remaining.toLocaleString()}</span>
                  </div>
                  <div className="text-blue-700 mt-1">This was applied to adjust the user's balance.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface FifoResultDisplayProps {
  fifoResult: {
    settlements?: FifoSettlement[];
    remaining?: number;
  };
  compact?: boolean;
}

export const FifoResultDisplay: React.FC<FifoResultDisplayProps> = ({ fifoResult, compact = false }) => {
  if (!fifoResult.settlements || fifoResult.settlements.length === 0) {
    return <div className="text-sm text-gray-500">No expense settlements</div>;
  }

  return (
    <div className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="font-medium text-gray-700">Expenses Paid (Oldest First):</div>
      {fifoResult.settlements.map((settlement, index) => (
        <div key={index} className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
          <span>Expense #{settlement.expense_id}</span>
          <Badge variant="outline" className="text-xs">
            ₹{settlement.amount_settled?.toLocaleString()}
          </Badge>
        </div>
      ))}
      {fifoResult.remaining && fifoResult.remaining > 0 && (
        <div className="flex justify-between items-center bg-blue-50 rounded px-2 py-1">
          <span>Balance Adjustment</span>
          <Badge variant="outline" className="text-xs bg-blue-100">
            ₹{fifoResult.remaining.toLocaleString()}
          </Badge>
        </div>
      )}
    </div>
  );
};