import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wallet, Printer, RefreshCw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { printLedgerReport } from './shared/ledger/PrintUtils';
import { useAuth } from '../context/AuthContext';
import { fetchLedgerSummary } from '../pages/ledger/api';
import { formatDate, parseDate, formatDisplayDate } from '../utils/dateUtils';

// Create simpleLedgerApi object to match expected interface
const simpleLedgerApi = {
  getSummary: fetchLedgerSummary
};


// Use values from user context if available
// Fallback to undefined if not present
function getFarmerId(user: any) {
  if (!user) return undefined;
  if (user.role === 'farmer') return Number(user.id || user.farmer_id);
  return Number(user.farmer_id);
}
function getShopId(user: any) {
  const shop_id = user?.shop_id;
  return typeof shop_id === 'number' ? shop_id : Number(shop_id) || 1;
}

export const FarmerLedgerDashboard: React.FC = () => {
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
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Load period summary data
  const loadPeriodData = useCallback(async (period?: 'daily' | 'weekly' | 'monthly') => {
    const periodToUse = period || selectedPeriod;
    setPeriodLoading(true);
    setPeriodError(null);
    try {
      if (!farmerId || !shopId) return;

      // Call API with correct function signature (shopId, period, farmerId, from, to)
      // Note: API only supports 'weekly' | 'monthly', so 'daily' becomes undefined (overall)
      const apiPeriod = periodToUse === 'daily' ? undefined : periodToUse;

      const data = await simpleLedgerApi.getSummary(shopId, apiPeriod, farmerId, fromDate ? formatDate(fromDate) : undefined, toDate ? formatDate(toDate) : undefined);

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
    const periodType = selectedPeriod === 'daily' ? 'Overall' : selectedPeriod === 'weekly' ? 'Weekly' : 'Monthly';

    printLedgerReport(
      {
        overall: periodData?.overall,
        period: periodData?.period,
        entries: [] // No individual entries for dashboard view
      },
      {
        title: 'Farmer Ledger Report',
        dateRange: periodType,
        categoryInfo: 'All Categories',
        farmerName: `Farmer #${farmerId}`,
        showEntries: false,
        showSummary: true,
        showPeriodBreakdown: true,
        isOwner: user?.role === 'owner'
      },
      [] // Empty users array since we don't have individual entries
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2">
                <span>📊 Farmer Ledger Dashboard</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPeriodData(selectedPeriod)}
                  disabled={periodLoading}
                  className="h-8 w-8 p-0 touch-manipulation"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${periodLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={!periodData || periodLoading}
                  className="h-8 w-8 p-0 touch-manipulation"
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </CardTitle>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                View your financial summary and period-wise breakdown
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Period Selection and Print Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            {/* Mobile Filter Toggle */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full justify-between p-3 h-auto border border-gray-200 hover:bg-gray-50"
              >
                <span className="font-medium text-sm">Filters & Period Selection</span>
                {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* Filter Controls */}
            <div className={`${filtersExpanded ? 'block' : 'hidden sm:block'} space-y-4`}>
              {/* Mobile Layout */}
              <div className="block sm:hidden space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">Period Type:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">From Date:</label>
                    <div className="relative">
                      <DatePicker
                        selected={fromDate}
                        onChange={(date) => setFromDate(date)}
                        dateFormat="dd-MM-yyyy"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholderText="DD-MM-YYYY"
                        isClearable
                        showPopperArrow={false}
                        popperPlacement="bottom"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">To Date:</label>
                    <div className="relative">
                      <DatePicker
                        selected={toDate}
                        onChange={(date) => setToDate(date)}
                        dateFormat="dd-MM-yyyy"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholderText="DD-MM-YYYY"
                        isClearable
                        showPopperArrow={false}
                        popperPlacement="bottom"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex flex-wrap items-end gap-6">
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-sm font-medium text-gray-700">Period:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <div className="relative">
                    <DatePicker
                      selected={fromDate}
                      onChange={(date) => setFromDate(date)}
                      dateFormat="dd-MM-yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholderText="DD-MM-YYYY"
                      isClearable
                      showPopperArrow={false}
                      popperPlacement="bottom-start"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <div className="relative">
                    <DatePicker
                      selected={toDate}
                      onChange={(date) => setToDate(date)}
                      dateFormat="dd-MM-yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholderText="DD-MM-YYYY"
                      isClearable
                      showPopperArrow={false}
                      popperPlacement="bottom-start"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {/* Mobile-friendly summary cards */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-green-700 truncate">Total Credit</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800 leading-tight break-words whitespace-pre-wrap max-w-[120px] xs:max-w-none">
                  ₹{Number(periodData?.overall?.credit || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600 flex-shrink-0 xs:ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-red-700 truncate">Total Debit</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-800 leading-tight break-words whitespace-pre-wrap max-w-[120px] xs:max-w-none">
                  ₹{Number(periodData?.overall?.debit || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-red-600 flex-shrink-0 xs:ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-orange-700 truncate">Commission</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800 leading-tight break-words whitespace-pre-wrap max-w-[120px] xs:max-w-none">
                  ₹{Number(periodData?.overall?.commission || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-orange-600 flex-shrink-0 xs:ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 shadow-sm ${Number(periodData?.overall?.balance || 0) >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">Net Balance</p>
                <p className={`text-lg sm:text-xl lg:text-2xl font-bold leading-tight break-words whitespace-pre-wrap max-w-[120px] xs:max-w-none ${Number(periodData?.overall?.balance || 0) >= 0 ? 'text-emerald-800' : 'text-red-800'}`}> 
                  ₹{Number(periodData?.overall?.balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <Wallet className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0 xs:ml-2 ${Number(periodData?.overall?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg font-semibold">
            {selectedPeriod === 'daily' ? 'Overall Summary' : selectedPeriod === 'weekly' ? 'Weekly Breakdown' : 'Monthly Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {periodLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-0">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 text-sm sm:text-base">Loading period data...</p>
              </div>
            </div>
          ) : !periodData || periodData.period.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-0">
              <p className="text-gray-600 mb-2 text-sm sm:text-base">No period data found</p>
              <p className="text-xs sm:text-sm text-gray-500">
                No transactions found for the selected period
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Stacked cards, Desktop: Table */}
              <div className="block sm:hidden px-4 pb-4">
                <div className="space-y-2">
                  {periodData.period.map((period) => (
                    <div key={period.period} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {formatDisplayDate(period.period)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-600">Credit:</span>
                          <span className="font-mono font-medium text-green-700 break-words whitespace-pre-wrap">
                            ₹{Number(period.credit).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-600">Debit:</span>
                          <span className="font-mono font-medium text-red-700 break-words whitespace-pre-wrap">
                            ₹{Number(period.debit).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-600">Commission:</span>
                          <span className="font-mono font-medium text-orange-700 break-words whitespace-pre-wrap">
                            ₹{Number(period.commission).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-600">Net Earning:</span>
                          <span className={`font-mono font-medium break-words whitespace-pre-wrap ${Number(period.balance) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            ₹{Number(period.balance).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Period</TableHead>
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
                          {formatDisplayDate(period.period)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-700 break-words whitespace-pre-wrap">
                          ₹{Number(period.credit).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-700 break-words whitespace-pre-wrap">
                          ₹{Number(period.debit).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-700 break-words whitespace-pre-wrap">
                          ₹{Number(period.commission).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className={`text-right font-mono break-words whitespace-pre-wrap ${Number(period.balance) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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