import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Wallet, Printer, Calendar, RefreshCw } from 'lucide-react';
import { simpleLedgerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/format';
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
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            📊 Farmer Ledger Dashboard xxx
            <Button
              variant="outline"
              size="sm"
              onClick={loadTodayData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <p className="text-muted-foreground">
            Track your sales, expenses, and available balance
          </p>
        </CardHeader>
      </Card>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dateRange"
                checked={isDateRangeMode}
                onChange={(e) => setIsDateRangeMode(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="dateRange" className="text-sm font-medium">
                Date Range Mode
              </label>
            </div>

            {isDateRangeMode && (
              <>
                <div>
                  <label className="text-sm font-medium">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={loadDateRangeData} disabled={loading}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Load Period
                </Button>
              </>
            )}

            <Button variant="outline" onClick={handlePrint} disabled={entries.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {isDateRangeMode ? 'Period Sales' : "Today's Sales"}
                </p>
                <p className="text-2xl font-bold text-green-800">
                  ₹{typeof totals.sales === 'number' ? totals.sales.toLocaleString('en-IN') : Number(totals.sales).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {isDateRangeMode ? 'Period Earnings' : "Today's Net Earnings"}
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  ₹{typeof totals.netEarnings === 'number' ? totals.netEarnings.toLocaleString('en-IN') : Number(totals.netEarnings).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">
                  {isDateRangeMode ? 'Period Expenses' : "Today's Expenses"}
                </p>
                <p className="text-2xl font-bold text-red-800">
                  ₹{typeof totals.expenses === 'number' ? totals.expenses.toLocaleString('en-IN') : Number(totals.expenses).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${availableBalance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Available Balance</p>
                <p className={`text-2xl font-bold ${availableBalance >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  ₹{typeof availableBalance === 'number' ? availableBalance.toLocaleString('en-IN') : Number(availableBalance).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className={`h-8 w-8 ${availableBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isDateRangeMode ? `Ledger Entries (${fromDate} to ${toDate})` : "Today's Ledger Entries"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading ledger data...</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">No ledger entries found</p>
              <p className="text-sm text-gray-500">
                {isDateRangeMode ? 'Try selecting a different date range' : 'No entries for today'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
                          : 'N/A'
                        }
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
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};