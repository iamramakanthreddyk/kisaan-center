import React, { useEffect, useState } from 'react';
import { fetchLedgerEntries } from './api';
import { useTransactionStore } from '../store/transactionStore';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { AlertCircle, Inbox, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User } from '../types';
import { formatAmount } from '../utils/format';

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
}

const LedgerList: React.FC<LedgerListProps> = ({ refreshTrigger = false, farmerId, from, to, category }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shopId = user?.shop_id ? Number(user.shop_id) : 1;
  const getUsersForShop = useTransactionStore(state => state.getUsers);
  const setUsersForShop = useTransactionStore(state => state.setUsers);

  useEffect(() => {
    // Ensure we have users cached for this shop so the farmer_id can be resolved to names
    const shopKey = String(shopId);
    const cached = getUsersForShop(shopKey);
    if (!cached || cached.length === 0) {
      (async () => {
        try {
          const res = await usersApi.getAll({ shop_id: shopId });
          const users = res.data || [];
          setUsersForShop(shopKey, users as User[]);
        } catch {
          // ignore - names will fallback to id
        }
      })();
    }

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

  const getFarmerName = (farmerId: number): string => {
    const shopKey = String(shopId);
    const users = getUsersForShop(shopKey) || [];
    const farmer = users.find(u => u.id === farmerId);
    return farmer ? `${farmer.firstname || ''} ${farmer.username}`.trim() : `Farmer #${farmerId}`;
  };

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

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 Account Entries
          {entries.length > 0 && (
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {entries.length} entries
            </span>
          )}
        </CardTitle>
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
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">{getFarmerName(entry.farmer_id)}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>{getTypeIcon(entry.type)}{entry.type.toUpperCase()}</div>
                  </div>
                  <div className="flex flex-wrap text-sm text-gray-600 gap-x-4 gap-y-1">
                    <div><span className="font-medium">Category:</span> <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{entry.category.toUpperCase()}</span></div>
                    <div><span className="font-medium">Credit:</span> <span className="font-mono">{entry.type === 'credit' ? formatAmount(entry.amount) : '-'}</span></div>
                    <div><span className="font-medium">Debit:</span> <span className="font-mono">{entry.type === 'credit' && entry.category === 'sale' ? formatAmount(entry.commission_amount || 0) : entry.type === 'debit' ? formatAmount(entry.amount) : '-'}</span></div>
                    <div><span className="font-medium">Date:</span> {(entry.transaction_date || entry.created_at) ? new Date(entry.transaction_date || entry.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-medium">Notes:</span> {entry.notes || <span className="text-gray-400 italic">No notes</span>}
                  </div>
                </div>
              ))}
              {/* Mobile summary row */}
              {entries.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* Balance Card */}
                  <div className="rounded-lg bg-green-50 p-3 flex flex-col items-center shadow-sm border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-700 font-semibold text-sm">Balance</span>
                      <span className="inline-block bg-green-200 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Available</span>
                    </div>
                    <div className={`font-mono text-lg font-bold mb-1 ${(() => {
                      const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const netBalance = totalCredits - totalDebits;
                      return netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-600';
                    })()}`}>{(() => {
                      const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      return formatAmount(totalCredits - totalDebits);
                    })()}</div>
                    <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(credits - debits)</div>
                  </div>
                  {/* Total Earning Card */}
                  <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                      <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                    </div>
                    <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formatAmount(entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</div>
                    <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission)</div>
                  </div>
                </div>
              )}
            </div>
            {/* Desktop: Responsive Card List layout (fills width) */}
            <div className="hidden md:flex flex-col gap-3 w-full">
              {/* Header row for column titles */}
              <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-xs text-gray-600 flex flex-row flex-wrap items-center w-full border">
                <div className="flex-shrink-0 w-24 mr-4">Type</div>
                <div className="flex-shrink-0 w-40 mr-4">Farmer</div>
                <div className="flex-shrink-0 w-20 mr-4">Category</div>
                <div className="flex-shrink-0 w-28 text-right mr-4" title="Amount credited to the account">Credit <span className="text-blue-400" title="Amount credited to the account">?</span></div>
                <div className="flex-shrink-0 w-32 text-right mr-4" title="Amount debited from the account (commission/withdrawals)">Debit <span className="text-blue-400" title="Amount debited from the account (commission/withdrawals)">?</span></div>
                <div className="flex-shrink-0 w-32 mr-4">Date</div>
                <div className="flex-grow min-w-[120px]">Notes</div>
              </div>
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 bg-white shadow-sm flex flex-row flex-wrap items-center w-full">
                  {/* Credit/Debit tag on the left */}
                  <div className="flex-shrink-0 w-24 mr-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}{entry.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-40 mr-4 font-semibold text-gray-800">{getFarmerName(entry.farmer_id)}</div>
                  <div className="flex-shrink-0 w-20 mr-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{entry.category.toUpperCase()}</span>
                  </div>
                  <div className="flex-shrink-0 w-28 text-right font-mono font-medium mr-4">{entry.type === 'credit' ? formatAmount(entry.amount) : '-'}</div>
                  <div className="flex-shrink-0 w-32 text-right font-mono font-medium mr-4">{entry.type === 'credit' && entry.category === 'sale' ? formatAmount(entry.commission_amount || 0) : entry.type === 'debit' ? formatAmount(entry.amount) : '-'}</div>
                  <div className="flex-shrink-0 w-32 mr-4 text-gray-600">{(entry.transaction_date || entry.created_at) ? new Date(entry.transaction_date || entry.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                  <div className="flex-grow min-w-[120px] text-xs text-gray-500 mt-1 md:mt-0">{entry.notes ? (<><span className="font-medium">Notes:</span> {entry.notes}</>) : <span className="text-gray-400 italic">No notes</span>}</div>
                </div>
              ))}
              {/* Summary cards below the list */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Balance Card */}
                <div className="rounded-lg bg-green-50 p-3 flex flex-col items-center shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-700 font-semibold text-sm">Balance</span>
                    <span className="inline-block bg-green-200 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Available</span>
                  </div>
                  <div className={`font-mono text-lg font-bold mb-1 ${(() => {
                    const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const netBalance = totalCredits - totalDebits;
                    return netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-600';
                  })()}`}>{(() => {
                    const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    return formatAmount(totalCredits - totalDebits);
                  })()}</div>
                  <div className="text-[11px] text-green-900/80 text-center leading-tight">Amount available to withdraw<br/>(earnings - withdrawals)</div>
                </div>
                {/* Total Earning Card */}
                <div className="rounded-lg bg-blue-50 p-3 flex flex-col items-center shadow-sm border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-700 font-semibold text-sm">Total Earning</span>
                    <span className="inline-block bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">From Sales</span>
                  </div>
                  <div className="font-mono text-lg font-bold mb-1 text-blue-700">{formatAmount(entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</div>
                  <div className="text-[11px] text-blue-900/80 text-center leading-tight">Farmer's actual earnings from sales<br/>(after commission)</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      {/* Print-only table */}
      <div className="hidden print-table">
        <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Farmer Accounts Ledger</h2>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
          <thead>
            <tr>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0'}}>Type</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0'}}>Farmer</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0'}}>Category</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right'}}>Credit</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right'}}>Debit</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0'}}>Date</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0'}}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td style={{border: '1px solid #000', padding: '4px'}}>{entry.type.toUpperCase()}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{getFarmerName(entry.farmer_id)}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{entry.category.toUpperCase()}</td>
                <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right'}}>{entry.type === 'credit' ? formatAmount(entry.amount) : '-'}</td>
                <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right'}}>{entry.type === 'credit' && entry.category === 'sale' ? formatAmount(entry.commission_amount || 0) : entry.type === 'debit' ? formatAmount(entry.amount) : '-'}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{(entry.transaction_date || entry.created_at) ? new Date(entry.transaction_date || entry.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{entry.notes || ''}</td>
              </tr>
            ))}
            {/* end of entries list */}
            <tr>
              <td colSpan={3} style={{border: '1px solid #000', padding: '4px', fontWeight: 'bold'}}>Balance</td>
              <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold'}}>{(() => {
                const totalCredits = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                const totalDebits = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount || 0), 0);
                return formatAmount(totalCredits - totalDebits);
              })()}</td>
              <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold'}}>{formatAmount(entries.filter(e => e.category === 'sale' && e.type === 'credit' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</td>
              <td colSpan={2} style={{border: '1px solid #000', padding: '4px'}}></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Pagination controls (shared mobile & desktop) */}
      <div className="px-2 py-2 flex items-center justify-between gap-2 bg-gray-50 rounded-lg border">
        <div className="text-xs text-gray-600 font-medium">
          Showing {(page-1)*pageSize + 1} - {Math.min(total, page*pageSize)} of {total} entries
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 min-h-[40px] touch-manipulation shadow-sm ${
              page <= 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
            }`}
            onClick={handlePrev}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <div className="bg-white px-2 py-1.5 rounded-md border font-semibold text-gray-700 shadow-sm text-xs">
            Page {page}
          </div>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 min-h-[40px] touch-manipulation shadow-sm ${
              page >= Math.ceil(total / pageSize)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
            }`}
            onClick={handleNext}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default LedgerList;
