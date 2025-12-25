import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wallet, Printer, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { simpleLedgerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';


// Use values from user context if available
// Fallback to undefined if not present
function getFarmerId(user: any) {
  if (!user) return undefined;
  if (user.role === 'farmer') return user.id || user.farmer_id;
  return user.farmer_id;
}
function getShopId(user: any) {
  return user?.shop_id;
}

export const SimpleFarmerLedgerDashboard: React.FC = () => {
  const { user } = useAuth();
  const farmerId = getFarmerId(user);
  const shopId = getShopId(user);

  // Period data state
  const [periodData, setPeriodData] = useState<{
    period: Array<{
      period: string;
      credit: string | number;
      debit: string | number;
      commission: string | number;
      balance: string | number;
    }>;
    overall: {
      credit: string | number;
      debit: string | number;
      commission: string | number;
      balance: string | number;
    };
  } | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Load period summary data
  const loadPeriodData = useCallback(async (period?: 'daily' | 'weekly' | 'monthly') => {
    const periodToUse = period || selectedPeriod;
    setPeriodLoading(true);
    setPeriodError(null);
    try {
      if (!farmerId || !shopId) return;

      // Use the summary endpoint with period parameter
      const params: any = {
        shop_id: String(shopId),
        farmer_id: String(farmerId),
        period: periodToUse
      };

      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      console.log('API params:', params); // Debug log

      const data = await simpleLedgerApi.getSummary(params);

      // The response is already the correct structure
      setPeriodData(data);
    } catch (e) {
      console.error('Error loading period data:', e);
      setPeriodError(e instanceof Error ? e.message : 'Failed to load period data');
      setPeriodData(null);
    } finally {
      setPeriodLoading(false);
    }
  }, [farmerId, shopId, selectedPeriod, fromDate, toDate]);

  // Load period data when component mounts or filters change
  useEffect(() => {
    if (farmerId && shopId) {
      loadPeriodData(selectedPeriod);
    }
  }, [farmerId, shopId, selectedPeriod, fromDate, toDate, loadPeriodData]);


  // Print functionality
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const periodType = selectedPeriod === 'daily' ? 'Daily' : selectedPeriod === 'weekly' ? 'Weekly' : 'Monthly';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Farmer Ledger Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #2e7d32; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .positive { color: #2e7d32; }
          .negative { color: #d32f2f; }
          .total { font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌾 Farmer Ledger Report</h1>
          <p><strong>Period Type:</strong> ${periodType}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
        </div>

        <div class="summary">
          <h2>Overall Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Total Credit</div>
              <div class="summary-value">₹${Number(periodData?.overall?.credit || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Total Debit</div>
              <div class="summary-value" style="color: #d32f2f;">₹${Number(periodData?.overall?.debit || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Total Commission</div>
              <div class="summary-value" style="color: #ff9800;">₹${Number(periodData?.overall?.commission || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Net Balance</div>
              <div class="summary-value" style="color: ${Number(periodData?.overall?.balance || 0) >= 0 ? '#2e7d32' : '#d32f2f'};">₹${Number(periodData?.overall?.balance || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <h2>${periodType} Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Credit</th>
              <th>Debit</th>
              <th>Commission</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${(periodData?.period || []).map(p => `
              <tr>
                <td>${p.period}</td>
                <td class="positive">₹${Number(p.credit).toLocaleString('en-IN')}</td>
                <td class="negative">₹${Number(p.debit).toLocaleString('en-IN')}</td>
                <td style="color: #ff9800;">₹${Number(p.commission).toLocaleString('en-IN')}</td>
                <td class="${Number(p.balance) >= 0 ? 'positive' : 'negative'}">₹${Number(p.balance).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex items-center justify-between gap-2">
            <span>📊 Farmer Ledger Dashboard</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPeriodData(selectedPeriod)}
                disabled={periodLoading}
              >
                <RefreshCw className={`h-4 w-4 ${periodLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!periodData || periodLoading}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <p className="text-muted-foreground text-sm sm:text-base">
            View your financial summary and period-wise breakdown
          </p>
        </CardHeader>
      </Card>

      {/* Period Selection and Print Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            {/* Mobile Filter Toggle */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full justify-between p-3 h-auto"
              >
                <span className="font-medium">Filters</span>
                {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* Filter Controls */}
            <div className={`space-y-4 ${filtersExpanded ? 'block' : 'hidden sm:flex'}`}>
              {/* Mobile Layout */}
              <div className="block sm:hidden space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Period:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">From:</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">To:</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex flex-row items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Period:</label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">From:</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">To:</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {periodError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {periodError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700">Total Credit</p>
                <p className="text-lg sm:text-2xl font-bold text-green-800">
                  ₹{Number(periodData?.overall?.credit || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700">Total Debit</p>
                <p className="text-lg sm:text-2xl font-bold text-red-800">
                  ₹{Number(periodData?.overall?.debit || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-700">Total Commission</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-800">
                  ₹{Number(periodData?.overall?.commission || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${Number(periodData?.overall?.balance || 0) >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Net Balance</p>
                <p className={`text-lg sm:text-2xl font-bold ${Number(periodData?.overall?.balance || 0) >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  ₹{Number(periodData?.overall?.balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className={`h-6 w-6 sm:h-8 sm:w-8 ${Number(periodData?.overall?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-lg font-semibold py-2 sm:py-3">
            {selectedPeriod === 'daily' ? 'Daily' : selectedPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periodLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 text-sm sm:text-base">Loading period data...</p>
              </div>
            </div>
          ) : !periodData || periodData.period.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-600 mb-2 text-sm sm:text-base">No period data found</p>
              <p className="text-xs sm:text-sm text-gray-500">
                No transactions found for the selected period
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Stacked cards, Desktop: Table */}
              <div className="block sm:hidden space-y-3">
                {periodData.period.map((period) => (
                  <div key={period.period} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {period.period}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Credit:</span>
                        <span className="font-mono text-green-700 ml-1">
                          ₹{Number(period.credit).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Debit:</span>
                        <span className="font-mono text-red-700 ml-1">
                          ₹{Number(period.debit).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Commission:</span>
                        <span className="font-mono text-orange-700 ml-1">
                          ₹{Number(period.commission).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Balance:</span>
                        <span className={`font-mono ml-1 ${Number(period.balance) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ₹{Number(period.balance).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodData.period.map((period) => (
                      <TableRow key={period.period}>
                        <TableCell className="font-medium">
                          {period.period}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-700">
                          ₹{Number(period.credit).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-700">
                          ₹{Number(period.debit).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-700">
                          ₹{Number(period.commission).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${Number(period.balance) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ₹{Number(period.balance).toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};