import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, Printer, Calendar, RefreshCw } from 'lucide-react';
import { simpleLedgerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { LedgerEntry } from '../types/api';


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
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isDateRangeMode, setIsDateRangeMode] = useState(false);

  // Load today's data by default
  useEffect(() => {
    if (farmerId && shopId) {
      loadTodayData();
    }
  }, [farmerId, shopId]);

  const loadTodayData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all entries for this farmer and shop (no server-side date filtering due to timezone issues)
      if (!farmerId || !shopId) return;
      const data = await simpleLedgerApi.getEntries({
        shop_id: String(shopId),
        farmer_id: String(farmerId)
      });
      
      const parsedData = Array.isArray(data) ? data.map(entry => ({
        ...entry,
        id: Number(entry.id),
        shop_id: Number(entry.shop_id),
        farmer_id: Number(entry.farmer_id),
        amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount,
        net_amount: entry.net_amount ? (typeof entry.net_amount === 'string' ? parseFloat(entry.net_amount) : entry.net_amount) : 0,
        commission_amount: entry.commission_amount ? (typeof entry.commission_amount === 'string' ? parseFloat(entry.commission_amount) : entry.commission_amount) : 0,
        created_by: Number(entry.created_by)
      } as LedgerEntry)) : [];
      
      // Filter for today's entries on the client side
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = parsedData.filter(entry => {
        if (!entry.created_at) return false;
        const entryDate = entry.created_at.split('T')[0];
        return entryDate === today;
      });
      
      console.log('Loaded all ledger entries:', parsedData.length);
      console.log('Filtered to today\'s entries:', todayEntries.length);
      console.log('Today\'s entries:', todayEntries);
      
      setEntries(todayEntries);
      setIsDateRangeMode(false);
    } catch (e) {
      console.error('Error loading ledger data:', e);
      setError(e instanceof Error ? e.message : 'Failed to load ledger data');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDateRangeData = async () => {
    if (!fromDate || !toDate) {
      setError('Please select both from and to dates');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!farmerId || !shopId) return;
      const data = await simpleLedgerApi.getEntries({
        shop_id: String(shopId),
        farmer_id: String(farmerId),
        from: fromDate,
        to: toDate
      });
      const parsedData = Array.isArray(data) ? data.map(entry => ({
        ...entry,
        id: Number(entry.id),
        shop_id: Number(entry.shop_id),
        farmer_id: Number(entry.farmer_id),
        amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : (typeof entry.amount === 'number' ? entry.amount : 0),
        net_amount: typeof entry.net_amount === 'string' ? parseFloat(entry.net_amount) : (typeof entry.net_amount === 'number' ? entry.net_amount : 0),
        commission_amount: typeof entry.commission_amount === 'string' ? parseFloat(entry.commission_amount) : (typeof entry.commission_amount === 'number' ? entry.commission_amount : 0),
        created_by: Number(entry.created_by)
      } as LedgerEntry)) : [];
      setEntries(parsedData);
      setIsDateRangeMode(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load date range data');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => {
      const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount);
      const netAmount = entry.net_amount ? (typeof entry.net_amount === 'number' ? entry.net_amount : parseFloat(entry.net_amount)) : amount;
      if (entry.type === 'credit') {
        acc.sales += amount;
        acc.netEarnings += netAmount;
      } else if (entry.type === 'debit') {
        if (entry.category === 'expense' || entry.category === 'withdrawal') {
          acc.expenses += amount;
        }
      }
      return acc;
    },
    { sales: 0, expenses: 0, netEarnings: 0 }
  );

  const availableBalance = totals.netEarnings - totals.expenses;

  // Print functionality
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateRange = isDateRangeMode ? `${fromDate} to ${toDate}` : new Date().toLocaleDateString('en-IN');

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
          .credit { color: #2e7d32; }
          .debit { color: #d32f2f; }
          .total { font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌾 Farmer Ledger Report</h1>
          <p><strong>Period:</strong> ${dateRange}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
        </div>

        <div class="summary">
          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Total Sales</div>
              <div class="summary-value">₹${Number(totals.sales).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Net Earnings</div>
              <div class="summary-value">₹${Number(totals.netEarnings).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Expenses</div>
              <div class="summary-value" style="color: #d32f2f;">₹${Number(totals.expenses).toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div>Available Balance</div>
              <div class="summary-value" style="color: ${availableBalance >= 0 ? '#2e7d32' : '#d32f2f'};">₹${Number(availableBalance).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <h2>Ledger Entries</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Net Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(entry => `
              <tr>
                <td>${entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td class="${entry.type === 'credit' ? 'credit' : 'debit'}">${entry.type.toUpperCase()}</td>
                <td>${entry.category.toUpperCase()}</td>
                <td>₹${Number(entry.amount).toLocaleString('en-IN')}</td>
                <td>${entry.net_amount ? '₹' + Number(entry.net_amount).toLocaleString('en-IN') : '-'}</td>
                <td>${entry.notes || '-'}</td>
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
          <CardTitle className="text-xl sm:text-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span>📊 Farmer Ledger Dashboard</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTodayData}
              disabled={loading}
              className="mt-2 sm:mt-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track your sales, expenses, and available balance
          </p>
        </CardHeader>
      </Card>

      {/* Filter, Date Range, and Print Controls - Unified Row, Mobile Friendly */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            {/* Filter and Date Range Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4 sm:items-end w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTodayData}
                disabled={loading || isDateRangeMode}
                className="min-w-[120px]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Today's Entries</span>
                <span className="sm:hidden">Today</span>
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dateRange"
                  checked={isDateRangeMode}
                  onChange={(e) => setIsDateRangeMode(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="dateRange" className="text-sm font-medium">
                  Date Range
                </label>
              </div>
              {isDateRangeMode && (
                <>
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-28 sm:w-32"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-28 sm:w-32"
                    />
                  </div>
                  <Button onClick={loadDateRangeData} disabled={loading || !fromDate || !toDate} variant="default" size="sm" className="min-w-[100px] sm:min-w-[120px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Load Period</span>
                    <span className="sm:hidden">Load</span>
                  </Button>
                </>
              )}
            </div>
            {/* Print Button - always visible, right-aligned */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button variant="outline" onClick={handlePrint} disabled={entries.length === 0} size="sm" className="min-w-[100px] sm:min-w-[120px]">
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Print Report</span>
                <span className="sm:hidden">Print</span>
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700">
                  {isDateRangeMode ? 'Period Sales' : "Today's Sales"}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-green-800">
                  ₹{typeof totals.sales === 'number' ? totals.sales.toLocaleString('en-IN') : Number(totals.sales).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700">
                  {isDateRangeMode ? 'Period Earnings' : "Today's Net Earnings"}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-blue-800">
                  ₹{typeof totals.netEarnings === 'number' ? totals.netEarnings.toLocaleString('en-IN') : Number(totals.netEarnings).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700">
                  {isDateRangeMode ? 'Period Expenses' : "Today's Expenses"}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-red-800">
                  ₹{typeof totals.expenses === 'number' ? totals.expenses.toLocaleString('en-IN') : Number(totals.expenses).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${availableBalance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700">Available Balance</p>
                <p className={`text-lg sm:text-2xl font-bold ${availableBalance >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  ₹{typeof availableBalance === 'number' ? availableBalance.toLocaleString('en-IN') : Number(availableBalance).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className={`h-6 w-6 sm:h-8 sm:w-8 ${availableBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Entries Table - Mobile Scrollable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-lg font-semibold py-2 sm:py-3">
            {isDateRangeMode ? (
              <span>
                <span className="block sm:inline">Ledger Entries</span>
                <span className="block sm:inline text-xs sm:text-base text-muted-foreground ml-0 sm:ml-2">({fromDate} to {toDate})</span>
              </span>
            ) : (
              <span className="block sm:inline">Today's Ledger Entries</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 text-sm sm:text-base">Loading ledger data...</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-600 mb-2 text-sm sm:text-base">No ledger entries found</p>
              <p className="text-xs sm:text-sm text-gray-500">
                {isDateRangeMode ? 'Try selecting a different date range' : 'No entries for today'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Stacked cards, Desktop: Table */}
              <div className="block sm:hidden space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'N/A'}
                      </span>
                      <Badge
                        variant={entry.type === 'credit' ? 'default' : 'destructive'}
                        className={entry.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      >
                        {entry.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.category.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-sm text-gray-800">
                        ₹{typeof entry.amount === 'number' ? entry.amount.toLocaleString('en-IN') : Number(entry.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="font-mono text-sm text-blue-700">
                        {entry.net_amount ? `Net: ₹${typeof entry.net_amount === 'number' ? entry.net_amount.toLocaleString('en-IN') : Number(entry.net_amount).toLocaleString('en-IN')}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Notes:</span> {entry.notes || '-'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.type === 'credit' ? 'default' : 'destructive'}
                            className={entry.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {entry.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.category.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{typeof entry.amount === 'number' ? entry.amount.toLocaleString('en-IN') : Number(entry.amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.net_amount ? `₹${typeof entry.net_amount === 'number' ? entry.net_amount.toLocaleString('en-IN') : Number(entry.net_amount).toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-600 max-w-xs truncate">
                          {entry.notes || '-'}
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