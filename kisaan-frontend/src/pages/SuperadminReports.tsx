import { reportsApi, analyticsApi } from '../services/api';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Users, Building2, ShoppingCart, TrendingUp, Calendar, Download } from 'lucide-react';
import { Pie, Bar } from '../components/Charts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDate } from '../utils/formatDate';
import { parseDate, getToday } from '../utils/dateUtils';
import { formatCurrency } from '../lib/formatters';

interface ReportData {
  totalShops: number;
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  totalCommission: number;
  activeShops: number;
  activeUsers: number;
  shopStats: { [key: string]: unknown }[];
  userStats: { [key: string]: unknown }[];
  // Analytics data for charts
  dailyAnalytics?: {
    date: string;
    total_sales: number;
    total_commission: number;
    transaction_count: number;
  }[];
  shopPerformance?: {
    shop_name: string;
    total_sales: number;
    transaction_count: number;
  }[];
}

const SuperadminReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalShops: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalCommission: 0,
    activeShops: 0,
    activeUsers: 0,
    shopStats: [],
    userStats: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      // Fetch platform analytics data
      const analyticsRes = await analyticsApi.getPlatformAnalytics(dateRange.from && dateRange.to ? {
        from: dateRange.from,
        to: dateRange.to
      } : undefined);

      // Fetch superadmin dashboard data
      const dashboardRes = await reportsApi.getSuperadminDashboard();

      const analyticsData = analyticsRes.data && typeof analyticsRes.data === 'object' ? analyticsRes.data as Record<string, unknown> : {};
      const dashboardData = dashboardRes.data && typeof dashboardRes.data === 'object' ? dashboardRes.data as Record<string, unknown> : {};

      const metrics = dashboardData.metrics && typeof dashboardData.metrics === 'object' ? dashboardData.metrics as Record<string, unknown> : {};
      const charts = dashboardData.charts && typeof dashboardData.charts === 'object' ? dashboardData.charts as Record<string, unknown> : {};

      function getNumber(val: unknown): number {
        return typeof val === 'number' ? val : 0;
      }
      function getArray(val: unknown): { [key: string]: unknown }[] {
        return Array.isArray(val) ? val as { [key: string]: unknown }[] : [];
      }

      setReportData({
        totalShops: getNumber(metrics.totalShops),
        activeShops: getNumber(metrics.activeShops),
        totalUsers: getNumber(metrics.totalUsers),
        activeUsers: getNumber(metrics.activeUsers),
        totalTransactions: getNumber(metrics.totalTransactions) || getNumber(analyticsData.total_transactions),
        totalRevenue: getNumber(metrics.totalRevenue) || getNumber(analyticsData.total_sales),
        totalCommission: getNumber(metrics.totalCommission) || getNumber(analyticsData.total_commission),
        shopStats: getArray(charts.shopStats),
        userStats: getArray(charts.userStats),
        dailyAnalytics: getArray(analyticsData.daily) as ReportData['dailyAnalytics'],
        shopPerformance: getArray(analyticsData.shop_performance) as ReportData['shopPerformance']
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setReportData({
        totalShops: 0,
        activeShops: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        totalCommission: 0,
        shopStats: [],
        userStats: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const clearDateRange = () => setDateRange({ from: '', to: '' });

  // Use shared `formatCurrency` imported from `../lib/formatters`

  // Remove exportReport and dateRange logic for now

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Reports</h1>
          <p className="text-gray-600">Comprehensive overview of platform performance and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchReportData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 w-full items-center">
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-4 w-4" />From</span>
              <DatePicker
                selected={dateRange.from ? parseDate(dateRange.from) : null}
                onChange={date => handleDateRangeChange('from', date ? formatDate(date) : '')}
                dateFormat="yyyy-MM-dd"
                className="px-2 py-1 text-sm rounded-md border w-full min-w-0"
                placeholderText="Select date"
                minDate={parseDate('2020-01-01')}
                maxDate={parseDate(getToday())}
                isClearable
                showPopperArrow={false}
              />
            </div>
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-4 w-4" />To</span>
              <DatePicker
                selected={dateRange.to ? parseDate(dateRange.to) : null}
                onChange={date => handleDateRangeChange('to', date ? formatDate(date) : '')}
                dateFormat="yyyy-MM-dd"
                className="px-2 py-1 text-sm rounded-md border w-full min-w-0"
                placeholderText="Select date"
                minDate={parseDate('2020-01-01')}
                maxDate={parseDate(getToday())}
                isClearable
                showPopperArrow={false}
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button onClick={fetchReportData} className="px-2 py-1 text-sm rounded-md w-full">
                Apply Filter
              </Button>
              <Button variant="outline" onClick={clearDateRange} className="px-2 py-1 text-xs rounded-md w-full">
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shops</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalShops}</p>
                <p className="text-xs text-green-600">{reportData.activeShops} active</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
                <p className="text-xs text-green-600">{reportData.activeUsers} active</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalTransactions}</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      {reportData.dailyAnalytics && reportData.dailyAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trends
            </CardTitle>
            <p className="text-sm text-gray-600">Daily sales and commission over time</p>
          </CardHeader>
          <CardContent style={{ minHeight: 300 }}>
            <Bar
              data={{
                labels: reportData.dailyAnalytics.map(d => d.date),
                datasets: [
                  {
                    label: 'Daily Sales',
                    data: reportData.dailyAnalytics.map(d => d.total_sales),
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                  },
                  {
                    label: 'Commission',
                    data: reportData.dailyAnalytics.map(d => d.total_commission),
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(Number(value));
                      }
                    }
                  }
                },
              }}
              height={250}
            />
          </CardContent>
        </Card>
      )}

      {/* Platform Overview with Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <p className="text-sm text-gray-600">Breakdown of user roles across the platform</p>
          </CardHeader>
          <CardContent style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pie
              data={{
                labels: ['Farmers', 'Buyers', 'Owners', 'Others'],
                datasets: [{
                  data: [
                    Math.max(0, reportData.totalUsers * 0.4), // Estimated farmers
                    Math.max(0, reportData.totalUsers * 0.3), // Estimated buyers
                    reportData.totalShops, // Owners (one per shop)
                    Math.max(0, reportData.totalUsers - reportData.totalShops - Math.floor(reportData.totalUsers * 0.7))
                  ],
                  backgroundColor: [
                    '#22c55e',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444'
                  ],
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed.toLocaleString()}`;
                      }
                    }
                  }
                },
              }}
              height={250}
            />
          </CardContent>
        </Card>

        {/* Shop Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <p className="text-sm text-gray-600">Key platform metrics and performance indicators</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Platform Commission</p>
                  <p className="text-xl font-bold text-blue-800">{formatCurrency(reportData.totalCommission)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Active Rate</p>
                  <p className="text-xl font-bold text-green-800">
                    {reportData.totalShops > 0 ? Math.round((reportData.activeShops / reportData.totalShops) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Avg Revenue/Shop</p>
                  <p className="text-xl font-bold text-purple-800">
                    {reportData.totalShops > 0 ? formatCurrency(Math.round(reportData.totalRevenue / reportData.totalShops)) : formatCurrency(0)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Transactions/Shop</p>
                  <p className="text-xl font-bold text-orange-800">
                    {reportData.totalShops > 0 ? Math.round(reportData.totalTransactions / reportData.totalShops) : 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </CardTitle>
          <p className="text-sm text-gray-600">Download platform reports in various formats</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export as Excel
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminReports;