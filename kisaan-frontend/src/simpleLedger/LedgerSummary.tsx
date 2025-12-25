import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchLedgerSummary } from './api';
import { formatAmount } from '../utils/format';

interface SummaryData {
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
}

interface LedgerSummaryProps {
  shopId: number;
  farmerId?: number;
  from?: string;
  to?: string;
  category?: string;
  hideOwnerCommission?: boolean;
  showOnlyOwnerCommission?: boolean;
  summaryData?: any;
  loading?: boolean;
  error?: string | null;
}

const LedgerSummary: React.FC<LedgerSummaryProps> = ({ shopId, farmerId, from, to, category, hideOwnerCommission, showOnlyOwnerCommission, summaryData, loading, error }) => {
  const [summary, setSummary] = useState<SummaryData>({
    totalCredit: 0,
    totalDebit: 0,
    netBalance: 0
  });
  const [breakdown, setBreakdown] = useState<Array<{ period: string; credit: number; debit: number }>>([]);

  useEffect(() => {
    if (!summaryData) {
      setSummary({ totalCredit: 0, totalDebit: 0, netBalance: 0 });
      setBreakdown([]);
      return;
    }
    if (showOnlyOwnerCommission) {
      let total = 0;
      if (Array.isArray(summaryData.period) && summaryData.period.length > 0) {
        total = summaryData.period.reduce((sum: number, row: any) => sum + Number(row.commission || 0), 0);
        setBreakdown(summaryData.period.map((row: any) => ({ period: row.period, total_commission: Number(row.commission || 0) })));
      } else {
        // If period is empty, use overall commission
        total = Number(summaryData.overall?.commission || 0);
        setBreakdown([]);
      }
      setSummary({ totalCredit: total, totalDebit: 0, netBalance: total });
    } else {
      const overall = summaryData.overall || { credit: 0, debit: 0, commission: 0, balance: 0 };
      setSummary({ totalCredit: Number(overall.credit || 0), totalDebit: Number(overall.debit || 0), netBalance: Number(overall.balance || 0) });
      if (Array.isArray(summaryData.period) && summaryData.period.length > 0) {
        setBreakdown(summaryData.period.map((row: any) => ({ period: row.period, credit: Number(row.credit || 0), debit: Number(row.debit || 0) })));
      } else {
        setBreakdown([]);
      }
    }
  }, [summaryData, showOnlyOwnerCommission]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center gap-3 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  // If only owner commission should be shown
  if (showOnlyOwnerCommission) {
    // Owner commission summary and breakdown (no separate filters)
    const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;
    const commissionValue = hasBreakdown
      ? summary.totalCredit
      : Number(summaryData?.overall?.commission || 0);
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              Total Shop Commission Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-700 mb-2">{formatAmount(commissionValue)}</div>
            <div className="text-xs text-gray-500">
              This is the total commission earned by the shop (owner)
              {hasBreakdown ? ' for the selected period.' : ' (overall, no period breakdown available).'}
            </div>
          </CardContent>
        </Card>
        {/* Period breakdown for owner commission */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Period Breakdown (Weekly)</CardTitle>
            </CardHeader>
            <CardContent>
              {hasBreakdown ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="px-2 py-1">Period</th>
                          <th className="px-2 py-1 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((b: any) => (
                          <tr key={b.period} className="border-t">
                            <td className="px-2 py-2">{b.period}</td>
                            <td className="px-2 py-2 text-right text-yellow-700">{formatAmount(b.total_commission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {breakdown.map((b: any) => (
                      <div key={b.period} className="p-3 border rounded-lg bg-white">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{b.period}</div>
                          <div className="text-sm font-semibold text-yellow-700">{formatAmount(b.total_commission)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">No data for selected period</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Hide owner commission from main summary if requested
  return (
    <>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Credit */}
        {!hideOwnerCommission && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                {farmerId ? 'Farmer Credit' : 'Total Credit'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{formatAmount(summary.totalCredit)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {farmerId ? 'Amount received from this farmer' : 'Amount received from all farmers'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Total Debit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              {farmerId ? 'Farmer Debit' : 'Total Debit'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatAmount(summary.totalDebit)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {farmerId ? 'Amount paid to this farmer' : 'Amount paid to all farmers'}
            </p>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {farmerId ? 'Farmer Balance' : 'All Farmers Balance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatAmount(summary.netBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {farmerId 
                ? (summary.netBalance >= 0 ? 'Amount due to this farmer' : 'Amount due from this farmer')
                : (summary.netBalance >= 0 ? 'Total amount due to all farmers' : 'Total amount due from all farmers')
              }
            </p>
          </CardContent>
        </Card>
      </div>
    {/* Breakdown table */}
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {farmerId ? 'Farmer Transaction Breakdown' : 'All Farmers Transaction Breakdown'} (Weekly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <div className="text-sm text-gray-500">No data for selected period</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-2 py-1">Period</th>
                      <th className="px-2 py-1 text-right">Credit</th>
                      <th className="px-2 py-1 text-right">Debit</th>
                      <th className="px-2 py-1 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map(b => (
                      <tr key={b.period} className="border-t">
                        <td className="px-2 py-2">{b.period}</td>
                        <td className="px-2 py-2 text-right text-green-600">{formatAmount(b.credit)}</td>
                        <td className="px-2 py-2 text-right text-red-600">{formatAmount(b.debit + b.credit * 0.1)}</td>
                        <td className="px-2 py-2 text-right">{formatAmount(b.credit - (b.debit + b.credit * 0.1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked list */}
              <div className="md:hidden space-y-2">
                {breakdown.map(b => (
                  <div key={b.period} className="p-3 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{b.period}</div>
                      <div className="text-sm font-semibold">{formatAmount(b.credit - (b.debit + b.credit * 0.1))}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
                      <div className="text-green-600">Credit: {formatAmount(b.credit)}</div>
                      <div className="text-red-600">Debit: {formatAmount(b.debit + b.credit * 0.1)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default LedgerSummary;
