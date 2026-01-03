import React, { useState, useCallback, useEffect } from 'react';
import LedgerList from './LedgerList';
import LedgerForm from './LedgerForm';
import LedgerSummary from './LedgerSummary';
import CashFlowChart from '../../components/CashFlowChart';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { BookOpen, Plus, Filter, Calendar, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserSearchDropdown } from '../../components/ui/UserSearchDropdown';
import { useUsers } from '../../context/useUsers';
import { fetchLedgerSummary } from './api';
import type { User } from '../../types/index';

interface SummaryData {
  overall?: {
    credit: number;
    debit: number;
    commission: number;
    balance: number;
  };
  [key: string]: any;
}

const SimpleLedger: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { allUsers } = useUsers();
  // Always use shopId as a number
  const shopId = typeof user?.shop_id === 'number' ? user.shop_id : Number(user?.shop_id) || 1;
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'commission'>('entries');
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  // For farmers, selectedFarmer is always their own id
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(() => (user?.role === 'farmer' ? Number(user.id) : null));
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showChart, setShowChart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Centralized summary cache - only fetch once when filters change
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // Memoized fetch function - only recreated when dependencies change
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      // For farmers, always use their own id
      const farmerIdParam = user?.role === 'farmer' ? Number(user.id) : selectedFarmer ?? undefined;
      const data = await fetchLedgerSummary(shopId, 'weekly', farmerIdParam, fromDate, toDate, selectedCategory || undefined) as SummaryData;
      setSummaryData(data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to fetch summary');
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [shopId, selectedFarmer, fromDate, toDate, selectedCategory, user]);
  
  // Fetch summary only when filters change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleEntryAdded = () => {
    setShowForm(false);
    setRefreshTrigger(!refreshTrigger);
  };

  const clearFilters = () => {
    if (user?.role !== 'farmer') setSelectedFarmer(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedCategory('');
  };

  const hasActiveFilters = selectedFarmer || fromDate || toDate || selectedCategory;

  return (
    <div className="w-full max-w-7xl mx-auto px-1 sm:px-2 md:px-4 lg:px-6 xl:px-8 pb-4 space-y-2 sm:space-y-4 md:space-y-6">
      <style>
        {`
          @media screen {
            .print-table { display: none !important; }
          }
          @media print {
            .no-print { display: none !important; }
            @page { margin: 0.5in; }
            body { margin: 0; padding: 0; }
            .print-table { display: block !important; }
            .print-table h2 { display: block !important; }
            .print-table table { width: 100% !important; border-collapse: collapse !important; }
            .print-table thead { display: table-header-group !important; }
            .print-table tbody { display: table-row-group !important; }
            .print-table tr { display: table-row !important; page-break-inside: avoid !important; }
            .print-table td { display: table-cell !important; }
            .print-table th { display: table-cell !important; }
          }
        `}
      </style>
      {/* Header Section - Mobile First Design */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl p-3 sm:p-4 md:p-6 border-0 shadow-xl text-white no-print overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1">
                Farmer Accounts Ledger
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm md:text-base lg:text-lg">
                Track farmer earnings, commissions, and payments
              </p>
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Export functionality is available in the Entries tab */}
          </div>
        </div>
      </div>

      {/* Filters Section - Mobile Optimized */}
      <div className="no-print">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:bg-blue-100 transition-all duration-200 rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span className="font-medium text-blue-900 text-sm sm:text-base">
              Filters {hasActiveFilters && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Active</span>}
            </span>
          </div>
          {showFilters ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
        </Button>

        {showFilters && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm mt-2 overflow-visible no-print">
            {hasActiveFilters && (
              <CardHeader className="py-1 px-2 border-b border-blue-100 bg-white/60 rounded-t-xl overflow-visible min-h-0">
                <div className="flex items-center justify-end flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-blue-700 hover:underline hover:bg-blue-50 px-1 py-0 min-h-0 h-6"
                  >
                    Clear All
                  </Button>
                </div>
              </CardHeader>
            )}
            <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4 px-3 sm:px-4 overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Only show farmer filter if not logged in as farmer */}
                {user?.role !== 'farmer' && (
                  <div className="flex flex-col gap-1 sm:gap-2 min-w-0 overflow-visible relative z-20">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      👤 Farmer
                    </label>
                    <div className="w-full overflow-visible relative z-20">
                      <UserSearchDropdown
                        onSelect={(u: User | null) => setSelectedFarmer(u?.id ?? null)}
                        roleFilter="farmer"
                        placeholder="Select farmer"
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" /> From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate ?? ''}
                    onChange={e => {
                      const newFromDate = e.target.value || undefined;
                      setFromDate(newFromDate);
                      if (newFromDate && !toDate) {
                        const today = new Date().toISOString().split('T')[0];
                        setToDate(today);
                      }
                    }}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-white shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" /> To Date
                  </label>
                  <input
                    type="date"
                    value={toDate ?? ''}
                    onChange={e=> setToDate(e.target.value || undefined)}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-white shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    📂 Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e=> setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-white shadow-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="sale">💰 Sale</option>
                    <option value="expense">💸 Expense</option>
                    <option value="withdrawal">🏦 Withdrawal</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs - Mobile Optimized */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 h-auto p-1 sm:p-2 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl no-print shadow-sm border border-blue-300 gap-0.5 sm:gap-1">
          <TabsTrigger
            value="entries"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[44px] sm:min-h-[48px] touch-manipulation"
          >
            <span className="text-base sm:text-lg">📒</span>
            <span className="text-center leading-tight text-xs sm:text-sm">Entries</span>
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[44px] sm:min-h-[48px] touch-manipulation"
          >
            <span className="text-base sm:text-lg">📈</span>
            <span className="text-center leading-tight text-xs sm:text-sm">Summary</span>
          </TabsTrigger>
          {hasRole('owner') && (
            <TabsTrigger
              value="commission"
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[44px] sm:min-h-[48px] col-span-2 lg:col-span-1 touch-manipulation"
            >
              <span className="text-base sm:text-lg">🏆</span>
              <span className="text-center leading-tight text-xs sm:text-sm">Commission</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="mt-3 sm:mt-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="no-print">
            {!showForm && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {hasActiveFilters ? '📋 Showing filtered results' : '📊 Showing all entries'}
                </div>
                <Button
                  onClick={() => setShowForm(true)}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm py-2.5 px-4 sm:py-2 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Add New Entry</span>
                </Button>
              </div>
            )}

            {showForm && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="py-3 sm:py-4 px-4 sm:px-6 border-b border-blue-100 bg-white/60 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-blue-900 text-base sm:text-lg">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <span>Add New Account Entry</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4">
                  <LedgerForm onSuccess={handleEntryAdded} onCancel={() => setShowForm(false)} />
                </CardContent>
              </Card>
            )}
            </div>

            <LedgerList
              refreshTrigger={refreshTrigger}
              farmerId={selectedFarmer ?? undefined}
              from={fromDate}
              to={toDate}
              category={selectedCategory || undefined}
              summaryData={summaryData}
            />
          </div>
        </TabsContent>

        {/* Summary Tab (hide owner commission) */}
        <TabsContent value="summary" className="mt-3 sm:mt-6 no-print">
          <div className="space-y-6">
            {/* Cash Flow Chart - Collapsible */}
            {summaryData?.period && Array.isArray(summaryData.period) && summaryData.period.length > 0 && (
              <Card className="border-blue-200 no-print">
                <CardHeader className="pb-3">
                  <Button
                    onClick={() => setShowChart(!showChart)}
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                  >
                    <CardTitle className="flex items-center gap-2 text-left">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Transaction Trends Chart
                    </CardTitle>
                    {showChart ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </CardHeader>
                {showChart && (
                  <CardContent className="pt-0">
                    <CashFlowChart
                      periodData={summaryData.period}
                      periodType="weekly"
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* Print-only Summary */}
            <div className="hidden print:block">
              <LedgerSummary
                farmerId={selectedFarmer ?? undefined}
                from={fromDate}
                to={toDate}
                category={selectedCategory || undefined}
                shopId={shopId}
                hideOwnerCommission={true}
                summaryData={summaryData}
              />
            </div>

            {/* Regular Summary */}
            <div className="no-print">
            <LedgerSummary
              farmerId={selectedFarmer ?? undefined}
              from={fromDate}
              to={toDate}
              category={selectedCategory || undefined}
              shopId={shopId}
              hideOwnerCommission={false}
              summaryData={summaryData}
              loading={summaryLoading}
              error={summaryError}
            />
            </div>
          </div>
        </TabsContent>
        {/* Owner Commission Tab (owner only) */}
        {hasRole('owner') && (
          <TabsContent value="commission" className="mt-3 sm:mt-6 no-print">
            <LedgerSummary
              shopId={shopId}
              from={fromDate}
              to={toDate}
              category={selectedCategory || undefined}
              farmerId={selectedFarmer ?? undefined}
              showOnlyOwnerCommission={true}
              summaryData={summaryData}
              loading={summaryLoading}
              error={summaryError}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SimpleLedger;
