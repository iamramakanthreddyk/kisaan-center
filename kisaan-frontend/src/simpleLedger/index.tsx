import React, { useState } from 'react';
import LedgerList from './LedgerList';
import LedgerForm from './LedgerForm';
import LedgerSummary from './LedgerSummary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { BookOpen, Plus, Download, Printer, Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserSearchDropdown } from '../components/ui/UserSearchDropdown';
import type { User } from '../types';
import { exportLedgerCsv } from './api';

const SimpleLedger: React.FC = () => {
  const { user, hasRole } = useAuth();
  const shopId = user?.shop_id ? Number(user.shop_id) : 1;
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'commission'>('entries');
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

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

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-2 md:px-4 py-4 space-y-4 sm:space-y-6">
      <style>
        {`
          @media print {
            body { font-size: 12px; }
            .no-print { display: none !important; }
            .print-table { display: block !important; }
            .print-table th, .print-table td { border: 1px solid #000; padding: 4px; text-align: left; }
            .print-table th { background: #f0f0f0; font-weight: bold; }
            .print-table .text-right { text-align: right; }
            .print-table .text-center { text-align: center; }
            @page { margin: 0.5in; }
          }
        `}
      </style>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 md:p-6 border border-blue-100 no-print">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Farmer Accounts</h1>
            <p className="text-gray-600 text-sm md:text-base">Track credits, debits, and balances for all farmers</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-xs"
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
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={e=> setSelectedCategory(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-xs"
                  >
                    <option value="">All Categories</option>
                    <option value="sale">Sale</option>
                    <option value="expense">Expense</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              {/* Action Buttons - Compact Row */}
              <div className="flex flex-row flex-wrap gap-2 mt-3 pt-2 border-t border-blue-100 items-center justify-end">
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
                  className="flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  onClick={()=> window.print()}
                  variant="outline"
                  className="flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList
          className="flex w-full justify-center bg-gradient-to-r from-blue-200 to-indigo-200 rounded-xl no-print shadow-sm border border-blue-300"
        >
          <TabsTrigger
            value="entries"
            className="flex items-center gap-2 px-4 py-2 sm:py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 border-r border-blue-300 first:rounded-l-xl last:border-r-0"
          >
            <span className="text-base sm:text-lg">📒</span>
            <span>Entries</span>
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex items-center gap-2 px-4 py-2 sm:py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 border-r border-blue-300 last:border-r-0"
          >
            <span className="text-base sm:text-lg">📈</span>
            <span>Summary</span>
          </TabsTrigger>
          {hasRole('owner') && (
            <TabsTrigger
              value="commission"
              className="flex items-center gap-2 px-4 py-2 sm:py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg hover:bg-blue-50 last:rounded-r-xl"
            >
              <span className="text-base sm:text-lg">🏆</span>
              <span>Commission</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="mt-6">
          <div className="space-y-4">
            {!showForm && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {hasActiveFilters ? 'Showing filtered results' : 'Showing all entries'}
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Entry
                </Button>
              </div>
            )}

            {showForm && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Plus className="h-5 w-5" />
                    Add New Account Entry
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SimpleLedger;
