import React, { useState, useCallback, useEffect } from 'react';
import LedgerList from './LedgerList';
import LedgerForm from './LedgerForm';
import LedgerSummary from './LedgerSummary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { BookOpen, Plus, Download, Printer, Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserSearchDropdown } from '../components/ui/UserSearchDropdown';
import { useUsers } from '../context/useUsers';
import type { User } from '../types';
import { exportLedgerCsv, fetchLedgerSummary, fetchLedgerEntries } from './api';
import { formatAmount } from '../utils/format';

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
  const shopId = user?.shop_id ? Number(user.shop_id) : 1;
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'commission'>('entries');
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
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
      const data = await fetchLedgerSummary(shopId, 'weekly', selectedFarmer ?? undefined, fromDate, toDate, selectedCategory || undefined) as SummaryData;
      setSummaryData(data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to fetch summary');
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [shopId, selectedFarmer, fromDate, toDate, selectedCategory]);
  
  // Fetch summary only when filters change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleEntryAdded = () => {
    setShowForm(false);
    setRefreshTrigger(!refreshTrigger);
  };

  const clearFilters = () => {
    setSelectedFarmer(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedCategory('');
  };

  const hasActiveFilters = selectedFarmer || fromDate || toDate || selectedCategory;

  const handlePrint = async () => {
    try {
      // Fetch actual summary data using the imported function
      const summary = await fetchLedgerSummary(shopId, 'weekly', selectedFarmer ?? undefined, fromDate, toDate, selectedCategory || undefined) as SummaryData;
      
      // Fetch actual ledger entries using the imported function
      const entriesResponse = await fetchLedgerEntries(shopId, selectedFarmer ?? undefined, fromDate, toDate, selectedCategory || undefined, 1, 1000);
      const entries = entriesResponse.entries || [];

      // Create a map for quick farmer name lookup from existing user data
      const shopUsers = allUsers.filter(u => Number(u.shop_id) === shopId);
      const farmerNameMap = new Map();
      shopUsers.forEach((user: any) => {
        let displayName;
        if (user.firstname && user.firstname.trim()) {
          displayName = user.firstname.trim();
        } else if (user.username && user.username.trim()) {
          displayName = user.username.trim();
        } else {
          displayName = `Farmer #${user.id}`;
        }
        farmerNameMap.set(Number(user.id), displayName);
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Get current filter info
      const farmerName = selectedFarmer ? farmerNameMap.get(selectedFarmer) || `Farmer #${selectedFarmer}` : 'All Farmers';
      const dateRange = fromDate && toDate ? `${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}` : 'All Dates';
      const categoryInfo = selectedCategory ? `Category: ${selectedCategory}` : 'All Categories';

      // Determine terminology based on user role
      const isOwner = hasRole('owner');
      const creditLabel = isOwner ? 'Total Farmer Earnings' : 'Total Credit';
      const debitLabel = isOwner ? 'Amount Paid to Farmers' : 'Total Debit';
      const balanceLabel = isOwner ? 'Amount Owed to Farmers' : 'Net Balance';
      const balanceDescription = isOwner ? '(Positive = Shop owes farmers, Negative = Farmers owe shop)' : '';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Farmer Accounts Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
            .summary { background: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #1e40af; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #374151; }
            .positive { color: #059669; font-weight: bold; }
            .negative { color: #dc2626; font-weight: bold; }
            .commission { color: #d97706; font-weight: bold; }
            .total { font-weight: bold; background-color: #fef3c7; }
            @media print { 
              body { margin: 0.5in; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌾 Farmer Accounts Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
          </div>

          <div class="filters">
            <h3 style="margin-bottom: 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">📋 Report Filters</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
              <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">👤 Farmer</div>
                <div style="color: #6b7280; font-size: 16px;">${farmerName}</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">📅 Date Range</div>
                <div style="color: #6b7280; font-size: 16px;">${dateRange}</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">🏷️ Category</div>
                <div style="color: #6b7280; font-size: 16px;">${categoryInfo}</div>
              </div>
            </div>
          </div>

          ${summary ? `
          <div class="summary">
            <h2>Summary Overview</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div>${creditLabel}</div>
                <div class="summary-value positive">₹${Number(summary.overall?.credit || 0).toLocaleString('en-IN')}</div>
              </div>
              <div class="summary-item">
                <div>${debitLabel}</div>
                <div class="summary-value negative">₹${Number(summary.overall?.debit || 0).toLocaleString('en-IN')}</div>
              </div>
              <div class="summary-item">
                <div>Total Commission</div>
                <div class="summary-value commission">₹${Number(summary.overall?.commission || 0).toLocaleString('en-IN')}</div>
              </div>
              <div class="summary-item">
                <div>${balanceLabel}</div>
                <div class="summary-value ${Number(summary.overall?.balance || 0) >= 0 ? 'positive' : 'negative'}">₹${Number(summary.overall?.balance || 0).toLocaleString('en-IN')}</div>
                ${balanceDescription ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${balanceDescription}</div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <h2>Transaction Details</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Farmer</th>
                <th>Description</th>
                <th>Category</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Commission</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${entries.length > 0 ? entries.map(entry => `
                <tr>
                  <td>${entry.transaction_date ? new Date(entry.transaction_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  <td>${farmerNameMap.get(entry.farmer_id) || `Farmer #${entry.farmer_id}`}</td>
                  <td>${entry.notes || '-'}</td>
                  <td>${entry.category}</td>
                  <td class="positive">${entry.type === 'credit' ? `₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}</td>
                  <td class="negative">${entry.type === 'debit' ? `₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}</td>
                  <td class="commission">${entry.commission_amount ? `₹${Number(entry.commission_amount).toLocaleString('en-IN')}` : '-'}</td>
                  <td class="${Number(entry.net_amount || 0) >= 0 ? 'positive' : 'negative'}">₹${Number(entry.net_amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('') : '<tr><td colspan="8" style="text-align: center; padding: 20px;">No transactions found for the selected filters.</td></tr>'}
            </tbody>
          </table>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Print error:', error);
      alert('Error generating print report. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-1 sm:px-2 md:px-4 lg:px-6 xl:px-8 pb-4 space-y-2 sm:space-y-4 md:space-y-6">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            @page { margin: 0.5in; }
          }
        `}
      </style>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 border border-blue-100 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Farmer Accounts</h1>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg line-clamp-2">Track credits, debits, and balances for all farmers</p>
            </div>
          </div>
          
          {/* Print and Export Buttons */}
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              onClick={async ()=>{
                try {
                  const blob = await exportLedgerCsv(shopId, selectedFarmer ?? undefined, fromDate, toDate, selectedCategory || undefined);
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
                  a.download = `farmer-accounts-${d}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch (err) {
                  console.error('Export failed', err);
                }
              }}
              variant="outline"
              className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">Print</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Section - Collapsible */}
      <div className="no-print">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:bg-blue-100 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-900">
              Filters {hasActiveFilters && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Active</span>}
            </span>
          </div>
          {showFilters ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-blue-500" />}
        </Button>

        {showFilters && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm mt-2">
            <CardHeader className="pb-2 border-b border-blue-100 bg-white/60 rounded-t-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base font-semibold text-blue-900">Filter Options</CardTitle>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700 mb-1">Farmer</label>
                  <UserSearchDropdown
                    onSelect={(u: User | null) => setSelectedFarmer(u?.id ?? null)}
                    roleFilter="farmer"
                    placeholder="Select farmer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-400" /> From
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-400" /> To
                  </label>
                  <input
                    type="date"
                    value={toDate ?? ''}
                    onChange={e=> setToDate(e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={e=> setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="sale">Sale</option>
                    <option value="expense">Expense</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              {/* Action Buttons - Better responsive layout */}
              <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-2 border-t border-blue-100 items-stretch sm:items-center justify-end">
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 h-auto p-1 sm:p-2 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl no-print shadow-sm border border-blue-300 gap-0.5 sm:gap-1">
          <TabsTrigger
            value="entries"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[40px] sm:min-h-[48px]"
          >
            <span className="text-base sm:text-base">📒</span>
            <span className="text-center leading-tight text-xs sm:text-sm">Entries</span>
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[40px] sm:min-h-[48px]"
          >
            <span className="text-base sm:text-base">📈</span>
            <span className="text-center leading-tight text-xs sm:text-sm">Summary</span>
          </TabsTrigger>
          {hasRole('owner') && (
            <TabsTrigger
              value="commission"
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 rounded-lg min-h-[40px] sm:min-h-[48px] col-span-2 lg:col-span-1"
            >
              <span className="text-base sm:text-base">🏆</span>
              <span className="text-center leading-tight text-xs sm:text-sm">Commission</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="mt-3 sm:mt-6">
          <div className="space-y-2 sm:space-y-4">
            {!showForm && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="text-xs sm:text-sm text-gray-600">
                  {hasActiveFilters ? 'Showing filtered results' : 'Showing all entries'}
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Add New Entry
                </Button>
              </div>
            )}

            {showForm && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-blue-900 text-base sm:text-lg">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add New Account Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                  <LedgerForm onSuccess={handleEntryAdded} onCancel={() => setShowForm(false)} />
                </CardContent>
              </Card>
            )}

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
        <TabsContent value="summary" className="mt-6">
          <LedgerSummary
            farmerId={selectedFarmer ?? undefined}
            from={fromDate}
            to={toDate}
            category={selectedCategory || undefined}
            shopId={shopId}
            hideOwnerCommission={true}
            summaryData={summaryData}
            loading={summaryLoading}
            error={summaryError}
          />
        </TabsContent>
        {/* Owner Commission Tab (owner only) */}
        {hasRole('owner') && (
          <TabsContent value="commission" className="mt-6">
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
