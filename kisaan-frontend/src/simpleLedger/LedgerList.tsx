import React, { useEffect, useState } from 'react';
import { fetchLedgerEntries } from './api';
import { useTransactionStore } from '../store/transactionStore';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { AlertCircle, Inbox, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

    const loadEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined, category ?? undefined);
        setEntries(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch ledger entries');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
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
                    <div><span className="font-medium">Amount:</span> <span className="font-mono">{formatAmount(entry.amount)}</span></div>
                    {entry.category === 'sale' && entry.net_amount !== undefined && (
                      <div><span className="font-medium">Net Amount:</span> <span className="font-mono">{formatAmount(entry.net_amount)}</span></div>
                    )}
                    <div><span className="font-medium">Date:</span> {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-medium">Notes:</span> {entry.notes || <span className="text-gray-400 italic">No notes</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Responsive Card List layout (fills width) */}
            <div className="hidden md:flex flex-col gap-3 w-full">
              {/* Header row for column titles */}
              <div className="px-3 py-2 bg-gray-50 rounded-lg font-semibold text-xs text-gray-600 flex flex-row flex-wrap items-center w-full border">
                <div className="flex-shrink-0 w-24 mr-4">Type</div>
                <div className="flex-shrink-0 w-40 mr-4">Farmer</div>
                <div className="flex-shrink-0 w-20 mr-4">Category</div>
                <div className="flex-shrink-0 w-28 text-right mr-4">Amount</div>
                <div className="flex-shrink-0 w-32 text-right mr-4">Total Earning</div>
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
                  <div className="flex-shrink-0 w-28 text-right font-mono font-medium mr-4">{formatAmount(entry.amount)}</div>
                  <div className="flex-shrink-0 w-32 text-right font-mono font-medium mr-4">{entry.category === 'sale' && entry.net_amount !== undefined ? formatAmount(entry.net_amount) : '-'}</div>
                  <div className="flex-shrink-0 w-32 mr-4 text-gray-600">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                  <div className="flex-grow min-w-[120px] text-xs text-gray-500 mt-1 md:mt-0">{entry.notes ? (<><span className="font-medium">Notes:</span> {entry.notes}</>) : <span className="text-gray-400 italic">No notes</span>}</div>
                </div>
              ))}
              {/* Summary row below the list */}
              <div className="border rounded-lg p-3 bg-blue-50 font-bold flex flex-row flex-wrap items-center w-full mt-2">
                <div className="flex-shrink-0 w-24 mr-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                    Balance
                  </span>
                </div>
                <div className="flex-shrink-0 w-40 mr-4">Net Balance</div>
                <div className="flex-shrink-0 w-20 mr-4" />
                <div className={`flex-shrink-0 w-28 text-right font-mono mr-4 ${(() => {
                  const netBalance = entries.reduce((sum, e) => e.type === 'credit' ? sum + Number(e.amount || 0) : sum - Number(e.amount || 0), 0);
                  return netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-600';
                })()}`}>{formatAmount(entries.reduce((sum, e) => e.type === 'credit' ? sum + Number(e.amount || 0) : sum - Number(e.amount || 0), 0))}</div>
                <div className="flex-shrink-0 w-32 text-right font-mono mr-4">{formatAmount(entries.filter(e => e.category === 'sale' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</div>
                <div className="flex-shrink-0 w-32 mr-4" />
                <div className="flex-grow min-w-[120px]" />
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
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right'}}>Amount</th>
              <th style={{border: '1px solid #000', padding: '4px', background: '#f0f0f0', textAlign: 'right'}}>Total Earning</th>
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
                <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right'}}>{formatAmount(entry.amount)}</td>
                <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right'}}>{entry.category === 'sale' && entry.net_amount !== undefined ? formatAmount(entry.net_amount) : '-'}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                <td style={{border: '1px solid #000', padding: '4px'}}>{entry.notes || ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{border: '1px solid #000', padding: '4px', fontWeight: 'bold'}}>Net Balance</td>
              <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold'}}>{formatAmount(entries.reduce((sum, e) => e.type === 'credit' ? sum + Number(e.amount || 0) : sum - Number(e.amount || 0), 0))}</td>
              <td style={{border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold'}}>{formatAmount(entries.filter(e => e.category === 'sale' && e.net_amount !== undefined).reduce((sum, e) => sum + Number(e.net_amount || 0), 0))}</td>
              <td colSpan={2} style={{border: '1px solid #000', padding: '4px'}}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default LedgerList;
