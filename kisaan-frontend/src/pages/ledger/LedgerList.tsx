import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLedgerEntries, fetchLedgerSummary } from './api';
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../context/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertCircle, Inbox, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Download, FileText, Printer } from 'lucide-react';
import { formatAmount } from '../../utils/format';
import { exportLedgerToCsv, exportLedgerToPdf } from '../../components/shared/ledger/ExportUtils';
import { printLedgerReport } from '../../components/shared/ledger/PrintUtils';

interface LedgerEntry {
  id: number;
  shop_id: number;
  farmer_id: number;
  amount: number;
  commission_amount?: number;
  net_amount?: number;
  type: string;
  category: string;
  notes?: string;
  transaction_date?: string; // Add transaction_date field
  created_at?: string;
  created_by: number;
}

interface LedgerListProps {
  refreshTrigger?: boolean;
  farmerId?: number;
  from?: string;
  to?: string;
  category?: string;
  summaryData?: any;
}

const LedgerList: React.FC<LedgerListProps> = ({ refreshTrigger = false, farmerId, from, to, category, summaryData }) => {
  const { user } = useAuth();
  const { allUsers } = useUsers();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallBalance, setOverallBalance] = useState<any>(summaryData?.overall || null);
  const [printData, setPrintData] = useState<LedgerEntry[]>([]);

  const shopId = user?.shop_id ? Number(user.shop_id) : 1;

  // Update balance when summaryData changes
  useEffect(() => {
    if (summaryData?.overall) {
      setOverallBalance(summaryData.overall);
    }
  }, [summaryData]);

  useEffect(() => {
    const loadEntries = async (pageToLoad = page) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined, category ?? undefined, pageToLoad, pageSize);
        setEntries(payload.entries);
        setTotal(typeof payload.total === 'number' ? payload.total : 0);
        setPage(typeof payload.page === 'number' ? payload.page : pageToLoad);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch ledger entries');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    loadEntries(1);
  }, [shopId, farmerId, from, to, category, refreshTrigger]);

  // Memoize shop users to prevent unnecessary re-renders
  const shopUsers = useMemo(() => allUsers.filter(u => Number(u.shop_id) === shopId), [allUsers, shopId]);

  const getFarmerName = useCallback((farmerId: number): string => {
    // Use memoized shopUsers to prevent infinite re-renders
    const farmer = shopUsers.find(u => Number(u.id) === farmerId);
    if (farmer) {
      // Priority: firstname first, then username, then ID
      if (farmer.firstname && farmer.firstname.trim()) {
        return farmer.firstname.trim();
      } else if (farmer.username && farmer.username.trim()) {
        return farmer.username.trim();
      } else {
        return `Farmer #${farmerId}`;
      }
    }
    return `Farmer #${farmerId}`;
  }, [shopUsers]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'text-green-700 bg-green-50';
      case 'debit':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  // Load a specific page (used by pagination handlers)
  const handleLoadPage = async (pageToLoad: number) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined, category ?? undefined, pageToLoad, pageSize);
      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
      setTotal(typeof payload.total === 'number' ? payload.total : 0);
      setPage(typeof payload.page === 'number' ? payload.page : pageToLoad);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (page <= 1) return;
    handleLoadPage(page - 1);
  };

  const handleNext = () => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page >= maxPage) return;
    handleLoadPage(page + 1);
  };

  const handlePrintAll = async () => {
    // Fetch all entries with large page size and overall balance
    try {
      const [entriesPayload, summaryData] = await Promise.all([
        fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined, category ?? undefined, 1, 10000),
        fetchLedgerSummary(shopId, undefined, farmerId ?? undefined, from ?? undefined, to ?? undefined)
      ]);
      
      const allEntries = entriesPayload.entries || [];
      const overall = summaryData?.overall;

      // Use printLedgerReport utility with transaction details and overall balance
      printLedgerReport(
        {
          overall: overall,
          entries: allEntries
        },
        {
          title: 'Ledger Entries Report',
          dateRange: from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Until ${to}` : 'All Dates',
          categoryInfo: category ? category : 'All Categories',
          farmerName: farmerId ? `Farmer #${farmerId}` : 'All Farmers',
          showEntries: true,
          showSummary: true,
          showPeriodBreakdown: false,
          isOwner: user?.role === 'owner'
        },
        allUsers
      );
    } catch (e) {
      console.error('Error fetching all entries for print:', e);
      alert('Error generating print report. Please try again.');
    }
  };

  const handleExportCSV = () => {
    exportLedgerToCsv({
      shopId,
      farmerId,
      from,
      to,
      category,
      filename: `ledger-entries-${new Date().toISOString().split('T')[0]}.csv`
    });
  };

  const handleExportPDF = () => {
    exportLedgerToPdf({
      shopId,
      farmerId,
      from,
      to,
      category
    });
  };

  return (
    <>
      <Card className="border-gray-200 no-print">
        <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            📝 Account Entries
            {entries.length > 0 && (
              <span className="text-xs md:text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {entries.length} entries
              </span>
            )}
          </CardTitle>

          {/* Export/PDF buttons - compact on mobile, full on desktop */}
          {!loading && !error && entries.length > 0 && (
            <div className="flex items-center gap-1 self-end md:self-auto print:hidden">
              {/* Mobile: Icon only buttons in one row */}
              <div className="flex md:hidden gap-1">
                <button
                  onClick={handleExportCSV}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                  title="Export CSV"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                  title="Export PDF"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  onClick={handlePrintAll}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                  title="Print All"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>

              {/* Desktop: Buttons with text */}
              <div className="hidden md:flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </button>
                <button
                  onClick={handlePrintAll}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                >
                  <Printer className="h-4 w-4" />
                  Print All
                </button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-gray-600">Loading account entries...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load entries</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2 font-medium">No account entries found</p>
            <p className="text-sm text-gray-500">
              {farmerId || from || to ? 'Try adjusting your filters' : 'Add your first entry to get started'}
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Mobile: Card/List layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {entries.map((entry) => {
                const isCreditType = entry.type === 'credit';
                const creditAmount = isCreditType ? Number(entry.amount || 0) : 0;
                const debitAmount = (isCreditType && entry.category === 'sale') ? Number(entry.commission_amount || 0) : entry.type === 'debit' ? Number(entry.amount || 0) : 0;
                const balance = creditAmount - debitAmount;
                const categoryColor = {
                  'sale': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'expense': 'bg-orange-50 text-orange-700 border-orange-200',
                  'withdrawal': 'bg-purple-50 text-purple-700 border-purple-200',
                  'other': 'bg-slate-50 text-slate-700 border-slate-200'
                }[entry.category.toLowerCase()] || 'bg-blue-50 text-blue-700 border-blue-200';
                
                return (
                  <div key={entry.id} className={`rounded-lg p-2.5 shadow-sm border-2 transition-all duration-200 ${
                    isCreditType 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
                  }`}>
                    {/* Header: Farmer name and type badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-xs truncate">{getFarmerName(entry.farmer_id)}</div>
                      </div>
                      <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-1 flex-shrink-0 ${
                        isCreditType
                          ? 'bg-white text-green-700 border border-green-200'
                          : 'bg-white text-blue-700 border border-blue-200'
                      }`}>
                        {getTypeIcon(entry.type)}
                        {entry.type === 'credit' ? 'Credit' : 'Debit'}
                      </div>
                    </div>

                    {/* Category and Date in one line */}
                    <div className="flex items-center justify-between text-[11px] mb-2 gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${categoryColor}`}>
                        {(() => {
                          switch (entry.category.toLowerCase()) {
                            case 'sale': return 'Sale';
                            case 'expense': return 'Expense';
                            case 'withdrawal': return 'Withdrawal';
                            case 'other': return 'Other';
                            default: return entry.category;
                          }
                        })()}
                      </span>
                      <span className="text-gray-600 flex-shrink-0">
                        {(entry.transaction_date || entry.created_at) ? new Date(entry.transaction_date || entry.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                      </span>
                    </div>

                    {/* Amount display in compact format */}
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-white/60 rounded border border-white/40 text-[11px]">
                      <div>
                        <div className="font-semibold text-gray-600 text-[9px]">Credit</div>
                        <div className="font-bold text-green-700">{isCreditType ? formatAmount(entry.amount) : '—'}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-600 text-[9px]">Debit</div>
                        <div className="font-bold text-red-700">{debitAmount > 0 ? formatAmount(debitAmount) : '—'}</div>
                      </div>
                    </div>

                    {/* Notes - show only if exists */}
                    {entry.notes && <div className="mt-1.5 pt-1.5 border-t border-white/50">
                      <div className="text-[10px] text-gray-700 italic line-clamp-2">{entry.notes}</div>
                    </div>}
                  </div>
                );
              })}
            </div>
            {/* Desktop: Responsive Card List layout (fills width) */}
            <div className="hidden md:flex flex-col gap-3 w-full">
              {/* Header row for column titles */}
              <div className="px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl font-bold text-xs text-slate-700 flex flex-row items-center w-full border border-slate-200 shadow-sm uppercase tracking-wider">
                <div className="flex-shrink-0 w-24 mr-4">Type</div>
                <div className="flex-shrink-0 w-40 mr-4">Farmer</div>
                <div className="flex-shrink-0 w-20 mr-4">Category</div>
                <div className="flex-shrink-0 w-28 text-right mr-4" title="Amount credited to the account">💰 Credit</div>
                <div className="flex-shrink-0 w-32 text-right mr-4" title="Amount debited from the account (commission/withdrawals)">📊 Debit</div>
                <div className="flex-shrink-0 w-32 mr-4">📅 Date</div>
                <div className="flex-grow min-w-[120px]">📝 Notes</div>
              </div>
              {entries.map((entry) => {
                const isCreditType = entry.type === 'credit';
                const creditAmount = isCreditType ? Number(entry.amount || 0) : 0;
                const debitAmount = (isCreditType && entry.category === 'sale') ? Number(entry.commission_amount || 0) : entry.type === 'debit' ? Number(entry.amount || 0) : 0;
                const categoryColor = {
                  'sale': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'expense': 'bg-orange-50 text-orange-700 border-orange-200',
                  'withdrawal': 'bg-purple-50 text-purple-700 border-purple-200',
                  'other': 'bg-slate-50 text-slate-700 border-slate-200'
                }[entry.category.toLowerCase()] || 'bg-blue-50 text-blue-700 border-blue-200';
                
                return (
                  <div key={entry.id} className={`rounded-xl p-4 flex flex-row items-center w-full shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                    isCreditType
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
                      : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-300'
                  }`}>
                    {/* Type badge */}
                    <div className="flex-shrink-0 w-24 mr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                        isCreditType
                          ? 'bg-white text-green-700 border border-green-200'
                          : 'bg-white text-blue-700 border border-blue-200'
                      }`}>
                        {getTypeIcon(entry.type)}
                        {entry.type === 'credit' ? '↑' : '↓'}
                      </span>
                    </div>
                    
                    {/* Farmer name */}
                    <div className="flex-shrink-0 w-40 mr-4 font-bold text-gray-900">{getFarmerName(entry.farmer_id)}</div>
                    
                    {/* Category badge */}
                    <div className="flex-shrink-0 w-20 mr-4">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${categoryColor}`}>
                        {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
                      </span>
                    </div>
                    
                    {/* Credit amount */}
                    <div className="flex-shrink-0 w-28 text-right mr-4">
                      <div className={`font-mono font-bold text-sm ${
                        isCreditType ? 'text-green-700' : 'text-gray-400'
                      }`}>
                        {isCreditType ? formatAmount(entry.amount) : '—'}
                      </div>
                    </div>
                    
                    {/* Debit amount */}
                    <div className="flex-shrink-0 w-32 text-right mr-4">
                      <div className={`font-mono font-bold text-sm ${
                        debitAmount > 0 ? 'text-red-700' : 'text-gray-400'
                      }`}>
                        {debitAmount > 0 ? formatAmount(debitAmount) : '—'}
                      </div>
                    </div>
                    
                    {/* Date */}
                    <div className="flex-shrink-0 w-32 mr-4">
                      <div className="text-sm font-medium text-gray-700">
                        {(entry.transaction_date || entry.created_at) ? new Date(entry.transaction_date || entry.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                    
                    {/* Notes */}
                    <div className="flex-grow min-w-[120px]">
                      {entry.notes ? (
                        <div className="text-xs text-gray-700 bg-white/50 rounded px-2.5 py-1.5 italic border border-white/60">{entry.notes}</div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No notes</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Summary cards - shown when not loading and not error */}
        {!loading && !error && (
          <>
            {/* Mobile summary row - stack cards vertically */}
            <div className="flex flex-col gap-2 md:hidden mt-2 w-full">
              {/* Balance Card (per-page) */}
              <div className="rounded-lg bg-green-50 p-3 flex flex-col items-center shadow-sm border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-700 font-semibold text-sm">Balance</span>
                  <span className="inline-block bg-green-200 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Page</span>
                </div>
                <div className={`font-mono text-lg font-bold mb-1 ${(() => {
                  const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
                  const balance = totalCredits - totalDebits - totalCommission;
                  return balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600';
                })()}`}>{(() => {
                  const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
                  const balance = totalCredits - totalDebits - totalCommission;
                  return formatAmount(balance);
                })()}</div>
                <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(from entries on this page)</div>
              </div>
              {/* Total Earning Card */}
              <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                  <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                </div>
                <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formatAmount(entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</div>
                <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission, from entries on this page)</div>
              </div>
              {/* Overall Balance Card */}
              <div className="rounded-lg bg-purple-50 p-3 flex flex-col items-center shadow-sm border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-700 font-semibold text-sm">Overall Balance</span>
                  <span className="inline-block bg-purple-200 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Total</span>
                </div>
                <div className="font-mono text-lg font-bold mb-1 text-purple-700">{
                  (() => {
                    // If overallBalance is present and has entries, recalculate with commission deducted
                    if (entries && entries.length > 0) {
                      const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
                      const balance = totalCredits - totalDebits - totalCommission;
                      return formatAmount(balance);
                    }
                    // fallback to API value if present
                    if (overallBalance && typeof overallBalance === 'object' && overallBalance.balance != null) {
                      return formatAmount(overallBalance.balance);
                    }
                    return 'N/A';
                  })()
                }</div>
                <div className="text-[11px] text-purple-900/80 text-center leading-tight">Total balance from all transactions<br/>(from API)</div>
              </div>
            </div>
            {/* Desktop summary cards */}
            <div className="hidden md:flex">
              <div className="grid grid-cols-3 gap-2 mt-2 w-full">
                {/* Balance Card (per-page) */}
                <div className="rounded-lg bg-green-50 p-3 flex flex-col items-center shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-700 font-semibold text-sm">Balance</span>
                    <span className="inline-block bg-green-200 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Page</span>
                  </div>
                  <div className={`font-mono text-lg font-bold mb-1 ${(() => {
                    const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
                    const balance = totalCredits - totalDebits - totalCommission;
                    return balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600';
                  })()}`}>{(() => {
                    const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
                    const balance = totalCredits - totalDebits - totalCommission;
                    return formatAmount(balance);
                  })()}</div>
                  <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(from entries on this page)</div>
                </div>
                {/* Total Earning Card */}
                <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                    <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                  </div>
                  <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formatAmount(entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</div>
                  <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission, from entries on this page)</div>
                </div>
                {/* Overall Balance Card */}
                <div className="rounded-lg bg-purple-50 p-3 flex flex-col items-center shadow-sm border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-700 font-semibold text-sm">Overall Balance</span>
                    <span className="inline-block bg-purple-200 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Total</span>
                  </div>
                  <div className="font-mono text-lg font-bold mb-1 text-purple-700">{(overallBalance && typeof overallBalance === 'object' && overallBalance.balance != null) ? formatAmount(overallBalance.balance) : 'N/A'}</div>
                  <div className="text-[11px] text-purple-900/80 text-center leading-tight">Total balance from all transactions<br/>(from API)</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      {/* Pagination controls (shared mobile & desktop) */}
      <div className="px-4 py-3 flex items-center justify-between gap-4 bg-gray-50 rounded-lg border mx-4 mb-4">
        {/* Mobile: Simple page/total display */}
        <div className="md:hidden text-sm text-gray-600 font-medium">
          Page {page} of {Math.ceil(total / pageSize)}
        </div>

        {/* Desktop: Full pagination controls */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          <div className="text-sm text-gray-600 font-medium">
            Showing {(page-1)*pageSize + 1} - {Math.min(total, page*pageSize)} of {total} entries
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 min-h-[44px] touch-manipulation shadow-sm ${
              page <= 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
            }`}
            onClick={handlePrev}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Desktop: Page numbers */}
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(Math.ceil(total / pageSize) - 4, page - 2)) + i;
              if (pageNum > Math.ceil(total / pageSize)) return null;
              return (
                <button
                  key={pageNum}
                  className={`px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 min-h-[44px] shadow-sm ${
                    pageNum === page
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                  onClick={() => handleLoadPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 min-h-[44px] touch-manipulation shadow-sm ${
              page >= Math.ceil(total / pageSize)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
            }`}
            onClick={handleNext}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
    </>
  );
};

export default LedgerList;
