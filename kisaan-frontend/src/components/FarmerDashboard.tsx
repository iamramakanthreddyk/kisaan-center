import type { User, Transaction, TransactionSummary, PaginatedResponse } from '../types/api';

// Enhanced farmer earnings response from backend
interface EnhancedFarmerEarnings extends TransactionSummary {
  farmer_info?: {
    id: number;
    username: string;
    firstname?: string;
    contact?: string;
    balance: number;
    cumulative_value: number;
  };
  period_summary?: {
    total_transactions: number;
    total_value: number;
    completed_transactions: number;
    pending_amount: number;
    average_transaction_value: number;
  };
  lifetime_summary?: {
    total_transactions: number;
    total_earnings: number;
    success_rate: number;
  };
}
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { transactionsApi } from '../services/api';

export const FarmerDashboard: React.FC<{ farmerId: number }> = ({ farmerId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [earnings, setEarnings] = useState<TransactionSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Default to last 7 days for meaningful data
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(lastWeekStr);
  const [toDate, setToDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5; // Show only 5 recent transactions

  // Fetch earnings and user data from the enhanced API
  useEffect(() => {
    fetchEarningsAndTransactions();
  }, [farmerId, fromDate, toDate, page]);

  const fetchEarningsAndTransactions = async () => {
    setLoading(true);
    try {
      // Fetch enhanced earnings summary (includes user data and analytics)
      const earningsRes = await transactionsApi.getFarmerEarnings(farmerId);
      const enhancedData = earningsRes?.data as EnhancedFarmerEarnings;
      
      if (enhancedData) {
        // Extract user data from the farmer_info in the enhanced API response
        if (enhancedData.farmer_info) {
          setUser({
            id: parseInt(enhancedData.farmer_info.id.toString()),
            username: enhancedData.farmer_info.username,
            firstname: enhancedData.farmer_info.firstname,
            contact: enhancedData.farmer_info.contact,
            balance: parseFloat(enhancedData.farmer_info.balance.toString()),
            cumulative_value: parseFloat(enhancedData.farmer_info.cumulative_value.toString()),
            // Set default values for required fields
            password: '',
            role: 'farmer' as const,
            status: 'active' as const,
            created_at: '',
            updated_at: ''
          });
        }
        
        // Set earnings summary using the enhanced data
        setEarnings({
          total_transactions: enhancedData.period_summary?.total_transactions || enhancedData.total_transactions || 0,
          total_value: enhancedData.period_summary?.total_value || enhancedData.total_value || 0,
          total_commission: 0, // Not relevant for farmers
          pending_count: enhancedData.pending_count || 0,
          completed_count: enhancedData.period_summary?.completed_transactions || enhancedData.completed_count || 0,
          average_transaction_value: enhancedData.period_summary?.average_transaction_value || enhancedData.average_transaction_value || 0
        });

        // Set enhanced stats from API response
        setEnhancedStats({
          periodEarnings: enhancedData.period_summary?.total_value || enhancedData.total_value || 0,
          avgEarningPerTransaction: enhancedData.period_summary?.average_transaction_value || enhancedData.average_transaction_value || 0,
          completedTransactions: enhancedData.period_summary?.completed_transactions || enhancedData.completed_count || 0,
          pendingAmount: enhancedData.period_summary?.pending_amount || 0,
          lifetimeEarnings: enhancedData.lifetime_summary?.total_earnings || 0,
          successRate: enhancedData.lifetime_summary?.success_rate || 0
        });
      }

      // Fetch transactions list with date filter (only if we need the list)
      const transactionsRes: PaginatedResponse<Transaction> = await transactionsApi.getAll({
        farmer_id: farmerId,
        from_date: fromDate,
        to_date: toDate,
        page,
        limit: pageSize
      });
      
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      console.error('Error fetching farmer data:', error);
      setTransactions([]);
    }
    setLoading(false);
  };

  // When user changes date, update filter and fetch
  const handleFilter = () => {
    setPage(1); // Reset to first page
    fetchEarningsAndTransactions();
  };

  // Generate HTML export report for farmer
  const handleExportPDF = () => {
    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN');
    
    const reportData = {
      farmer: user,
      transactions,
      earnings,
      enhancedStats,
      dateRange: `${fromDate} to ${toDate}`,
      totalEarnings: enhancedStats.periodEarnings,
      totalTransactions: earnings?.total_transactions || 0
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Farmer Report - ${user?.firstname || user?.username}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #2E7D32; padding-bottom: 20px; margin-bottom: 30px; }
        .farmer-info { background: #E8F5E8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: #f1f8e9; padding: 15px; margin-bottom: 20px; border-left: 4px solid #4CAF50; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #2E7D32; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .amount { text-align: right; font-weight: bold; }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .completed { background: #c8e6c9; color: #2e7d32; }
        .pending { background: #fff3e0; color: #f57c00; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌾 KisaanCenter - Farmer Report</h1>
        <h2>${user?.firstname || user?.username || 'Farmer'}</h2>
        <p>Period: ${reportData.dateRange}</p>
        <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
    </div>
    
    <div class="farmer-info">
        <h3>👨‍🌾 Farmer Information</h3>
        <p><strong>Name:</strong> ${user?.firstname || user?.username || 'N/A'}</p>
        <p><strong>Contact:</strong> ${user?.contact || 'N/A'}</p>
        <p><strong>Current Balance:</strong> ${formatCurrency(user?.balance || 0)}</p>
        <p><strong>Cumulative Earnings:</strong> ${formatCurrency(user?.cumulative_value || 0)}</p>
    </div>
    
    <div class="summary">
        <h3>📊 Period Summary (${reportData.dateRange})</h3>
        <p><strong>Total Transactions:</strong> ${reportData.totalTransactions}</p>
        <p><strong>Total Earnings:</strong> ${formatCurrency(reportData.totalEarnings)}</p>
        <p><strong>Average per Transaction:</strong> ${formatCurrency(reportData.enhancedStats.avgEarningPerTransaction)}</p>
        <p><strong>Completed Sales:</strong> ${reportData.enhancedStats.completedTransactions} (${reportData.enhancedStats.successRate.toFixed(1)}% success rate)</p>
        <p><strong>Pending Amount:</strong> ${formatCurrency(reportData.enhancedStats.pendingAmount)}</p>
    </div>
    
    <h3>🧾 Transaction Details</h3>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Sale</th>
                <th>Your Earning</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.length > 0 ? transactions.map(t => `
            <tr>
                <td>${formatDate(t.transaction_date)}</td>
                <td>${t.product_name}</td>
                <td>${t.quantity}</td>
                <td class="amount">${formatCurrency(t.unit_price)}</td>
                <td class="amount">${formatCurrency(t.total_amount)}</td>
                <td class="amount" style="background: #e8f5e8;">${formatCurrency(t.farmer_earning)}</td>
                <td><span class="status ${t.status}">${t.status.toUpperCase()}</span></td>
            </tr>
            `).join('') : '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No transactions found for this period</td></tr>'}
        </tbody>
    </table>
    
    <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0; font-size: 12px; color: #666; text-align: center;">
            This report was generated from KisaanCenter on ${new Date().toLocaleString('en-IN')}
        </p>
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farmer-report-${user?.username || 'farmer'}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Get enhanced data from API response instead of calculating from limited transactions
  const [enhancedStats, setEnhancedStats] = useState<{
    periodEarnings: number;
    avgEarningPerTransaction: number;
    completedTransactions: number;
    pendingAmount: number;
    lifetimeEarnings: number;
    successRate: number;
  }>({
    periodEarnings: 0,
    avgEarningPerTransaction: 0,
    completedTransactions: 0,
    pendingAmount: 0,
    lifetimeEarnings: 0,
    successRate: 0
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🌾 Welcome, {user?.firstname ?? user?.username}!</CardTitle>
          <p className="text-muted-foreground">Here's your overview</p>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Current Balance</p>
                <p className="text-2xl font-bold text-green-800">₹ {typeof user?.balance === 'number' ? user.balance.toLocaleString('en-IN') : '0'}</p>
              </div>
              <div className="text-green-600 text-3xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Lifetime Earnings</p>
                <p className="text-2xl font-bold text-blue-800">₹ {typeof user?.cumulative_value === 'number' ? user.cumulative_value.toLocaleString('en-IN') : '0'}</p>
              </div>
              <div className="text-blue-600 text-3xl">📈</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Period Earnings</p>
                <p className="text-2xl font-bold text-purple-800">₹ {enhancedStats.periodEarnings.toLocaleString('en-IN')}</p>
                <p className="text-xs text-purple-600">{fromDate} to {toDate}</p>
              </div>
              <div className="text-purple-600 text-3xl">🎯</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Avg per Sale</p>
                <p className="text-2xl font-bold text-orange-800">₹ {enhancedStats.avgEarningPerTransaction.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-orange-600">{earnings?.total_transactions || 0} transactions</p>
              </div>
              <div className="text-orange-600 text-3xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed Sales</span>
                <span className="font-semibold text-green-600">{enhancedStats.completedTransactions} / {earnings?.total_transactions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Amount</span>
                <span className="font-semibold text-orange-600">₹ {enhancedStats.pendingAmount.toLocaleString('en-IN')}</span>
              </div>
              {/* Success Rate hidden as requested */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lifetime Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Lifetime Earnings</span>
              <span className="font-bold text-2xl text-green-600">₹ {enhancedStats.lifetimeEarnings.toLocaleString('en-IN')}</span>
            </div>
            {/* Success Rate removed as requested */}
            <div className="pt-3 space-y-2">
              <Button className="w-full" onClick={handleExportPDF} variant="outline">
                � Download Report
              </Button>
              <Button className="w-full" onClick={handleFilter} disabled={loading} size="sm">
                🔄 Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter & Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sales Activity</CardTitle>
          <div className="flex gap-4 items-center">
            <Input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              className="w-40"
            />
            <Button onClick={handleFilter} disabled={loading} size="sm">
              {loading ? '🔄' : '🔍'} Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Your Earning</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading ? '🔄 Loading your sales data...' : '📭 No sales found for this period'}
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, pageSize).map((txn: Transaction) => (
                    <tr key={txn.id} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2">
                        {new Date(txn.transaction_date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </td>
                      <td className="px-3 py-2 font-medium">{txn.product_name}</td>
                      <td className="px-3 py-2 text-right">{txn.quantity}</td>
                      <td className="px-3 py-2 text-right">₹{txn.unit_price}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">
                        ₹{txn.farmer_earning.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : txn.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {txn.status === 'completed' ? '✅' : txn.status === 'pending' ? '⏳' : '❓'} {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {transactions.length > pageSize && (
              <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Showing latest {Math.min(pageSize, transactions.length)} of {transactions.length} sales
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
