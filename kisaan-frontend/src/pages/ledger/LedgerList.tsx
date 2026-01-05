import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLedgerEntries, fetchLedgerSummary, updateLedgerEntry, deleteLedgerEntry } from './api';
// If you have a toastService, import it. Otherwise, use window.alert as fallback.
const toastService = {
  success: (msg: string) => globalThis.alert(msg),
  error: (msg: string) => globalThis.alert(msg)
};
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../context/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
// ...existing code...
import { AlertCircle, Inbox, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Download, FileText, Printer, Edit, Trash2 } from 'lucide-react';
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
  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
  deletion_reason?: string;
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

  // Get shop ID for API calls
  const shopId = Number(user?.shop_id) || 1;
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallBalance, setOverallBalance] = useState<any>(summaryData?.overall || null);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    farmer_id: '',
    type: '',
    category: '',
    amount: '',
    notes: '',
    entry_date: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  // Smart caching system
  const [pageCache, setPageCache] = useState<Map<string, { entries: LedgerEntry[], total: number, timestamp: number }>>(new Map());
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const [currentFilterKey, setCurrentFilterKey] = useState<string>('');

  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // Generate cache key for current filters
  const getCacheKey = useCallback((pageNum: number) => {
    return `${shopId}-${farmerId || 'all'}-${from || 'none'}-${to || 'none'}-${category || 'all'}-${pageNum}`;
  }, [shopId, farmerId, from, to, category]);

  // Generate filter key to detect filter changes
  const getFilterKey = useCallback(() => {
    return `${shopId}-${farmerId || 'all'}-${from || 'none'}-${to || 'none'}-${category || 'all'}`;
  }, [shopId, farmerId, from, to, category]);

  // Check if cache entry is valid
  const isCacheValid = useCallback((cacheEntry: { timestamp: number }) => {
    return Date.now() - cacheEntry.timestamp < CACHE_EXPIRY;
  }, []);

  // Clear cache for current filter set
  const clearFilterCache = useCallback(() => {
    setPageCache(prev => {
      const newCache = new Map();
      const currentFilterPrefix = getFilterKey();
      for (const [key, value] of prev) {
        if (!key.startsWith(currentFilterPrefix) && isCacheValid(value)) {
          newCache.set(key, value);
        }
      }
      return newCache;
    });
  }, [getFilterKey, isCacheValid]);

  // Load page from cache or API
  const loadPage = useCallback(async (pageToLoad: number, forceRefresh = false) => {
    const cacheKey = getCacheKey(pageToLoad);
    const cached = pageCache.get(cacheKey);

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && isCacheValid(cached)) {
      setEntries(cached.entries);
      setTotal(cached.total);
      setPage(pageToLoad);
      return;
    }

    // Check if already loading this page
    if (loadingPages.has(pageToLoad)) {
      return;
    }

    setLoadingPages(prev => new Set(prev).add(pageToLoad));
    setError(null);

    try {
      const payload = await fetchLedgerEntries(
        shopId,
        farmerId ?? undefined,
        from ?? undefined,
        to ?? undefined,
        category ?? undefined,
        pageToLoad,
        pageSize
      );

      const newEntries = Array.isArray(payload.entries) ? payload.entries : [];
      const newTotal = typeof payload.total === 'number' ? payload.total : 0;

      // Update cache
      setPageCache(prev => new Map(prev).set(cacheKey, {
        entries: newEntries,
        total: newTotal,
        timestamp: Date.now()
      }));

      // Update state only if this is still the current page being loaded
      if (!loadingPages.has(pageToLoad) || pageToLoad === page) {
        setEntries(newEntries);
        setTotal(newTotal);
        setPage(pageToLoad);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch ledger entries');
      setEntries([]);
    } finally {
      setLoadingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageToLoad);
        return newSet;
      });
    }
  }, [shopId, farmerId, from, to, category, pageSize, getCacheKey, pageCache, isCacheValid, loadingPages, page]);

  // Prefetch adjacent pages
  const prefetchPages = useCallback(async (currentPage: number) => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const pagesToPrefetch = [];

    // Prefetch next 2 pages
    if (currentPage + 1 <= maxPage) pagesToPrefetch.push(currentPage + 1);
    if (currentPage + 2 <= maxPage) pagesToPrefetch.push(currentPage + 2);

    // Prefetch previous page
    if (currentPage > 1) pagesToPrefetch.push(currentPage - 1);

    for (const pageNum of pagesToPrefetch) {
      const cacheKey = getCacheKey(pageNum);
      if (!pageCache.has(cacheKey) || !isCacheValid(pageCache.get(cacheKey)!)) {
        // Load in background without blocking UI
        loadPage(pageNum, false).catch(console.error);
      }
    }
  }, [total, pageSize, getCacheKey, pageCache, isCacheValid, loadPage]);


  // Update balance when summaryData changes
  useEffect(() => {
    if (summaryData?.overall) {
      setOverallBalance(summaryData.overall);
    }
  }, [summaryData]);

  // Handle filter changes - clear cache and reset to page 1
  useEffect(() => {
    const newFilterKey = getFilterKey();
    if (newFilterKey !== currentFilterKey) {
      setCurrentFilterKey(newFilterKey);
      clearFilterCache();
      setPage(1);
      setLoading(true);
      loadPage(1, true).finally(() => setLoading(false));
    }
  }, [getFilterKey, currentFilterKey, clearFilterCache, loadPage]);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger) {
      clearFilterCache();
      setLoading(true);
      loadPage(page, true).finally(() => setLoading(false));
    }
  }, [refreshTrigger, clearFilterCache, loadPage, page]);

  // Prefetch pages when current page changes
  useEffect(() => {
    if (total > 0 && !loading) {
      prefetchPages(page);
    }
  }, [page, total, loading, prefetchPages]);

  // Periodic cache cleanup
  useEffect(() => {
    const cleanup = () => {
      setPageCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev) {
          if (isCacheValid(value)) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    };

    const interval = setInterval(cleanup, CACHE_EXPIRY / 2); // Clean every 2.5 minutes
    return () => clearInterval(interval);
  }, [isCacheValid, CACHE_EXPIRY]);

  // Memoize shop users to prevent unnecessary re-renders
  const shopUsers = useMemo(() => allUsers.filter(u => Number(u.shop_id) === shopId), [allUsers, shopId]);

  const getFarmerName = useCallback((farmerId: number): string => {
    // Use memoized shopUsers to prevent infinite re-renders
    const farmer = shopUsers.find(u => Number(u.id) === farmerId);
    if (farmer) {
      // Priority: firstname first, then username, then ID
      if (farmer?.firstname?.trim()) {
        return farmer.firstname.trim();
      } else if (farmer?.username?.trim()) {
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

  // ...existing code...

  // Load a specific page (used by pagination handlers)
  const handleLoadPage = async (pageToLoad: number) => {
    setLoading(true);
    try {
      await loadPage(pageToLoad);
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
    try {
      // Try to get all entries from cache first
      const filterPrefix = getFilterKey();
      const allEntries: LedgerEntry[] = [];
      let totalEntries = 0;

      // Collect all cached pages for current filter
      for (const [cacheKey, cacheData] of pageCache) {
        if (cacheKey.startsWith(filterPrefix) && isCacheValid(cacheData)) {
          allEntries.push(...cacheData.entries);
          totalEntries = Math.max(totalEntries, cacheData.total);
        }
      }

      // If we don't have all entries cached, fetch them
      let overall: any = null;
      if (allEntries.length < totalEntries) {
        const [entriesPayload, summaryData] = await Promise.all([
          fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined, category ?? undefined, 1, 10000),
          fetchLedgerSummary(shopId, undefined, farmerId ?? undefined, from ?? undefined, to ?? undefined)
        ]);

        allEntries.length = 0; // Clear cached entries
        allEntries.push(...(entriesPayload.entries || []));
        overall = summaryData?.overall;
      } else {
        // Use cached summary if available
        const summaryData = await fetchLedgerSummary(shopId, undefined, farmerId ?? undefined, from ?? undefined, to ?? undefined);
        overall = summaryData?.overall;
      }

      // Extract dateRange logic to an independent statement (no ternary)
      let dateRange = 'All Dates';
      if (from && to) {
        dateRange = `${from} to ${to}`;
      } else if (from) {
        dateRange = `From ${from}`;
      } else if (to) {
        dateRange = `Until ${to}`;
      }

      printLedgerReport(
        {
          overall: overall,
          entries: allEntries
        },
        {
          title: 'Ledger Entries Report',
          dateRange: dateRange,
          categoryInfo: category || 'All Categories',
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
      toastService.error('Error generating print report. Please try again.');
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

  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEditForm({
      farmer_id: String(entry.farmer_id),
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
      notes: entry.notes || '',
      entry_date: entry.transaction_date ? new Date(entry.transaction_date).toISOString().split('T')[0] : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({
      farmer_id: '',
      type: '',
      category: '',
      amount: '',
      notes: '',
      entry_date: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    setEditLoading(true);
    try {
      const updateData: any = {
        shop_id: user?.shop_id ? Number(user.shop_id) : 1,
        farmer_id: Number(editForm.farmer_id),
        type: editForm.type,
        category: editForm.category,
        amount: Number(editForm.amount),
        notes: editForm.notes || undefined,
        created_by: user?.id,
        ...(editForm.entry_date ? { entry_date: editForm.entry_date } : {})
      };
      await updateLedgerEntry(editingEntry.id, updateData);
      await handleLoadPage(page);
      handleCancelEdit();
      toastService.success('Entry updated successfully!');
    } catch (error) {
      console.error('Error updating entry:', error);
      toastService.error('Failed to update entry. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    const reason = prompt('Please provide a reason for deleting this entry (optional):', '');
    if (reason === null) return; // User cancelled

    const confirmMessage = 'This entry will be marked as deleted but kept in the system for audit purposes. Are you sure?';
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteLedgerEntry(entryId, reason || undefined);
      // Refresh the current page
      await handleLoadPage(page);
      toastService.success('Entry has been marked as deleted (soft delete). It can be viewed in audit logs.');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toastService.error('Failed to delete entry. Please try again.');
    }
  };

  // Calculate balance and class for summary cards (used in both mobile and desktop)

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
                let debitAmount = 0;
                if (isCreditType && entry.category === 'sale') {
                  debitAmount = Number(entry.commission_amount || 0);
                } else if (entry.type === 'debit') {
                  debitAmount = Number(entry.amount || 0);
                }
                const categoryColors: { [key: string]: string } = {
                  'sale': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'expense': 'bg-orange-50 text-orange-700 border-orange-200',
                  'withdrawal': 'bg-purple-50 text-purple-700 border-purple-200',
                  'other': 'bg-slate-50 text-slate-700 border-slate-200'
                };
                const categoryColor = categoryColors[entry.category.toLowerCase()] || 'bg-blue-50 text-blue-700 border-blue-200';
                let cardBg = '';
                if (entry.is_deleted) {
                  cardBg = 'bg-red-50 border-red-200 opacity-60';
                } else if (isCreditType) {
                  cardBg = 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200';
                } else {
                  cardBg = 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200';
                }
                return (
                  <div key={entry.id} className={`rounded-lg p-2.5 shadow-sm border-2 transition-all duration-200 ${cardBg}`}>
                    {/* Header: Farmer name and type badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-gray-900 text-xs truncate ${entry.is_deleted ? 'line-through' : ''}`}>{getFarmerName(entry.farmer_id)}</div>
                        {entry.is_deleted && (
                          <div className="text-[9px] text-red-600 font-medium">DELETED</div>
                        )}
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

                    {/* Action buttons - only show for non-deleted entries */}
                    {!entry.is_deleted && (
                      <div className="mt-2 flex gap-2 pt-2 border-t border-white/50">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 text-white text-[10px] rounded hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    )}
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
                <div className="flex-grow min-w-[120px] mr-4">📝 Notes</div>
                <div className="flex-shrink-0 w-24">Actions</div>
              </div>
              {entries.map((entry) => {
                const isCreditType = entry.type === 'credit';
                let debitAmount = 0;
                if (isCreditType && entry.category === 'sale') {
                  debitAmount = Number(entry.commission_amount || 0);
                } else if (entry.type === 'debit') {
                  debitAmount = Number(entry.amount || 0);
                }
                const categoryColors: { [key: string]: string } = {
                  'sale': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'expense': 'bg-orange-50 text-orange-700 border-orange-200',
                  'withdrawal': 'bg-purple-50 text-purple-700 border-purple-200',
                  'other': 'bg-slate-50 text-slate-700 border-slate-200'
                };
                const categoryColor = categoryColors[entry.category.toLowerCase()] || 'bg-blue-50 text-blue-700 border-blue-200';
                let cardBg = '';
                if (entry.is_deleted) {
                  cardBg = 'bg-red-50 border-red-200 opacity-60';
                } else if (isCreditType) {
                  cardBg = 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300';
                } else {
                  cardBg = 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-300';
                }
                return (
                  <div key={entry.id} className={`rounded-xl p-4 flex flex-row items-center w-full shadow-sm border-2 transition-all duration-200 hover:shadow-md ${cardBg}`}>
                    {/* Type badge */}
                    <div className="flex-shrink-0 w-24 mr-4">
                      {(() => {
                        let typeBadgeClass = 'bg-white text-blue-700 border border-blue-200';
                        if (entry.is_deleted) {
                          typeBadgeClass = 'bg-red-100 text-red-700';
                        } else if (isCreditType) {
                          typeBadgeClass = 'bg-white text-green-700 border border-green-200';
                        }
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${typeBadgeClass}`}>
                            {getTypeIcon(entry.type)}
                            {entry.type === 'credit' ? '↑' : '↓'}
                          </span>
                        );
                      })()}
                    </div>
                    
                    {/* Farmer name */}
                    <div className={`flex-shrink-0 w-40 mr-4 font-bold text-gray-900 ${entry.is_deleted ? 'line-through' : ''}`}>{getFarmerName(entry.farmer_id)}</div>
                    
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

                    {/* Actions - only show for non-deleted entries */}
                    <div className="flex-shrink-0 w-24 flex gap-1">
                      {!entry.is_deleted ? (
                        <>
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Edit entry"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="flex items-center justify-center p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-red-600 font-medium self-center">Deleted</span>
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
            {/* Precompute summary card values */}
            {(() => {
              // Per-page balance
              const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const totalCommission = entries.filter(e => e.type === 'credit' && e.commission_amount).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);
              const balance = totalCredits - totalDebits - totalCommission;
              let balanceClass = 'text-gray-600';
              if (balance > 0) {
                balanceClass = 'text-green-600';
              } else if (balance < 0) {
                balanceClass = 'text-red-600';
              }
              const formattedBalance = formatAmount(balance);

              // Total earning (from sales, after commission)
              const totalEarning = entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0);
              const formattedTotalEarning = formatAmount(totalEarning);

              // Overall balance (from API summary)
              let formattedOverallBalance = 'N/A';
              if (overallBalance && typeof overallBalance === 'object' && overallBalance.balance != null) {
                formattedOverallBalance = formatAmount(overallBalance.balance);
              }

              // Render summary cards
              return (
                <>
                  {/* Mobile summary row - stack cards vertically */}
                  <div className="flex flex-col gap-2 md:hidden mt-2 w-full">
                    {/* Balance Card (per-page) */}
                    <div className="rounded-lg bg-green-50 p-3 flex flex-col items-center shadow-sm border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-green-700 font-semibold text-sm">Balance</span>
                        <span className="inline-block bg-green-200 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Page</span>
                      </div>
                      <div className={`font-mono text-lg font-bold mb-1 ${balanceClass}`}>{formattedBalance}</div>
                      <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(from entries on this page)</div>
                    </div>
                    {/* Total Earning Card */}
                    <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                        <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                      </div>
                      <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formattedTotalEarning}</div>
                      <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission, from entries on this page)</div>
                    </div>
                    {/* Overall Balance Card */}
                    <div className="rounded-lg bg-purple-50 p-3 flex flex-col items-center shadow-sm border border-purple-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-700 font-semibold text-sm">Overall Balance</span>
                        <span className="inline-block bg-purple-200 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Total</span>
                      </div>
                      <div className="font-mono text-lg font-bold mb-1 text-purple-700">{formattedOverallBalance}</div>
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
                        <div className={`font-mono text-lg font-bold mb-1 ${balanceClass}`}>{formattedBalance}</div>
                        <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(from entries on this page)</div>
                      </div>
                      {/* Total Earning Card */}
                      <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                          <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                        </div>
                        <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formattedTotalEarning}</div>
                        <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission, from entries on this page)</div>
                      </div>
                      {/* Overall Balance Card */}
                      <div className="rounded-lg bg-purple-50 p-3 flex flex-col items-center shadow-sm border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-700 font-semibold text-sm">Overall Balance</span>
                          <span className="inline-block bg-purple-200 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Total</span>
                        </div>
                        <div className="font-mono text-lg font-bold mb-1 text-purple-700">{formattedOverallBalance}</div>
                        <div className="text-[11px] text-purple-900/80 text-center leading-tight">Total balance from all transactions<br/>(from API)</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
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

    {/* Edit Entry Modal */}
    {editingEntry && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Ledger Entry</h3>

            <div className="space-y-4">
              {/* Farmer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farmer</label>
                <select
                  value={editForm.farmer_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, farmer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {shopUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstname || user.username || `Farmer #${user.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sale">Sale</option>
                  <option value="deposit">Deposit</option>
                  <option value="expense">Expense</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Entry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date (Optional)</label>
                <input
                  type="date"
                  value={editForm.entry_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, entry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    </>
  );
};

export default LedgerList;
