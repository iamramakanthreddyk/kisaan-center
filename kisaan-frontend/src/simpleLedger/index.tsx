import React, { useState } from 'react';
import LedgerList from './LedgerList';
import LedgerForm from './LedgerForm';
import LedgerSummary from './LedgerSummary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { BookOpen, Plus, Download, Printer, Filter, Calendar } from 'lucide-react';
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

      {/* Filters Section - Mobile Friendly */}
      <Card className="border-gray-200 no-print">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:gap-3 md:grid md:grid-cols-4 md:gap-4">
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium text-gray-700">Farmer</label>
              <UserSearchDropdown
                onSelect={(u: User | null) => setSelectedFarmer(u?.id ?? null)}
                roleFilter="farmer"
                placeholder="Select farmer to filter"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From Date
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                To Date
              </label>
              <input
                type="date"
                value={toDate ?? ''}
                onChange={e=> setToDate(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory}
                onChange={e=> setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="sale">Sale</option>
                <option value="expense">Expense</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
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
              className="flex items-center gap-2 justify-center"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            <Button
              onClick={()=> window.print()}
              variant="outline"
              className="flex items-center gap-2 justify-center"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className={`grid w-full ${hasRole('owner') ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-100 overflow-x-auto whitespace-nowrap rounded-lg no-print`}>
          <TabsTrigger value="entries" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            📝 Account Entries
          </TabsTrigger>
          <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            📊 Summary Report
          </TabsTrigger>
          {hasRole('owner') && (
            <TabsTrigger value="commission" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              💰 Owner Commission
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
