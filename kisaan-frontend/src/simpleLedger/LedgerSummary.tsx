import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchLedgerSummary, fetchOwnerCommissionSummary } from './api';
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
}

const LedgerSummary: React.FC<LedgerSummaryProps> = ({ shopId, farmerId, from, to, category, hideOwnerCommission, showOnlyOwnerCommission }) => {
  const [summary, setSummary] = useState<SummaryData>({
    totalCredit: 0,
    totalDebit: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [breakdown, setBreakdown] = useState<Array<{ period: string; credit: number; debit: number }>>([]);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        if (showOnlyOwnerCommission) {
          // Fetch owner commission summary
          const data = await fetchOwnerCommissionSummary(shopId, period, from, to);
          let total = 0;
          if (Array.isArray(data) && data.length > 0) {
            // If grouped by period, sum all; else, use first
            if (data[0].total_commission !== undefined) {
              total = data.reduce((sum, row) => sum + Number(row.total_commission || 0), 0);
            } else if (data[0].total !== undefined) {
              total = data.reduce((sum, row) => sum + Number(row.total || 0), 0);
            }
          }
          setSummary({ totalCredit: total, totalDebit: 0, netBalance: total });
          setBreakdown([]);
        } else {
          const data = await fetchLedgerSummary(shopId, period, farmerId, from, to, category);
          // Expecting an array of rows: [{ period, type, total }, ...]
          let rows: any[] = [];
          if (Array.isArray(data)) rows = data;
          else if (data && Array.isArray((data as { data?: unknown[] }).data)) rows = (data as { data?: unknown[] }).data ?? [];
          else rows = [];
          let totalCredit = 0;
          let totalDebit = 0;
          // Build a map per period
          const map: Record<string, { credit: number; debit: number }> = {};
          for (const r of rows ?? []) {
            const t = typeof r.total === 'string' ? parseFloat(r.total) : Number(r.total || 0);
            const key = r.period || 'unknown';
            if (!map[key]) map[key] = { credit: 0, debit: 0 };
            if ((r.type || '').toString().toLowerCase() === 'credit') {
              totalCredit += t;
              map[key].credit += t;
            } else {
              totalDebit += t;
              map[key].debit += t;
            }
          }
          setSummary({ totalCredit, totalDebit, netBalance: totalCredit - totalDebit });
          // Convert map to sorted array (latest period first)
          const arr = Object.keys(map).map(k => ({ period: k, credit: map[k].credit, debit: map[k].debit }));
          arr.sort((a, b) => b.period.localeCompare(a.period));
          setBreakdown(arr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [shopId, farmerId, from, to, category, period, showOnlyOwnerCommission]);

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
            <div className="text-4xl font-bold text-yellow-700 mb-2">{formatAmount(summary.totalCredit)}</div>
            <div className="text-xs text-gray-500">This is the total commission earned by the shop (owner) for the selected period.</div>
          </CardContent>
        </Card>
        {/* Period breakdown for owner commission */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Period Breakdown ({period})</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(breakdown) && breakdown.length === 0 ? (
                <div className="text-sm text-gray-500">No data for selected period</div>
              ) : (
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
                        {Array.isArray(breakdown) && breakdown.map((b: any) => (
                          <tr key={b.period} className="border-t">
                            <td className="px-2 py-2">{b.period}</td>
                            <td className="px-2 py-2 text-right text-yellow-700">{formatAmount(b.total_commission)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {Array.isArray(breakdown) && breakdown.map((b: any) => (
                      <div key={b.period} className="p-3 border rounded-lg bg-white">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{b.period}</div>
                          <div className="text-sm font-semibold text-yellow-700">{formatAmount(b.total_commission)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">View period:</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPeriod('weekly')} className={`px-3 py-1 rounded ${period === 'weekly' ? 'bg-primary text-white' : 'bg-gray-100'}`}>Weekly</button>
          <button onClick={() => setPeriod('monthly')} className={`px-3 py-1 rounded ${period === 'monthly' ? 'bg-primary text-white' : 'bg-gray-100'}`}>Monthly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Credit */}
        {!hideOwnerCommission && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Credit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{formatAmount(summary.totalCredit)}</div>
              <p className="text-xs text-gray-500 mt-1">Amount received</p>
            </CardContent>
          </Card>
        )}

        {/* Total Debit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Debit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatAmount(summary.totalDebit)}</div>
            <p className="text-xs text-gray-500 mt-1">Amount paid</p>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatAmount(summary.netBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.netBalance >= 0 ? 'Amount due to farmer' : 'Amount due from farmer'}
            </p>
          </CardContent>
        </Card>
      </div>
    {/* Breakdown table */}
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Period Breakdown ({period})</CardTitle>
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
                        <td className="px-2 py-2 text-right text-red-600">{formatAmount(b.debit)}</td>
                        <td className="px-2 py-2 text-right">{formatAmount(b.credit - b.debit)}</td>
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
                      <div className="text-sm font-semibold">{formatAmount(b.credit - b.debit)}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
                      <div className="text-green-600">Credit: {formatAmount(b.credit)}</div>
                      <div className="text-red-600">Debit: {formatAmount(b.debit)}</div>
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
