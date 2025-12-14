import React, { useEffect, useState } from 'react';
import { fetchLedgerEntries } from './api';
import { useTransactionStore } from '../store/transactionStore';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/table';
import { AlertCircle, Inbox } from 'lucide-react';
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
}

const LedgerList: React.FC<LedgerListProps> = ({ refreshTrigger = false, farmerId, from, to }) => {
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
        const data = await fetchLedgerEntries(shopId, farmerId ?? undefined, from ?? undefined, to ?? undefined);
        setEntries(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch ledger entries');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [shopId, farmerId, from, to, refreshTrigger]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ledger Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">Loading entries...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">No ledger entries yet</p>
            <p className="text-sm text-gray-500">Create your first entry to get started</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Desktop / tablet table view */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell className="font-semibold">Farmer</TableCell>
                    <TableCell className="font-semibold">Date</TableCell>
                    <TableCell className="font-semibold">Type</TableCell>
                    <TableCell className="font-semibold">Category</TableCell>
                    <TableCell className="font-semibold text-right">Commission</TableCell>
                    <TableCell className="font-semibold text-right">Net</TableCell>
                    <TableCell className="font-semibold text-right">Amount</TableCell>
                    <TableCell className="font-semibold">Notes</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {(() => {
                          const users = getUsersForShop(String(entry.shop_id)) || [];
                          const u = users.find((us: User) => us.id === entry.farmer_id);
                          return u ? (u.username || u.firstname || `#${u.id}`) : `#${entry.farmer_id}`;
                        })()}
                      </TableCell>

                      <TableCell className="text-sm">
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          entry.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{entry.category}</TableCell>
                      <TableCell className="text-right font-medium text-gray-700">{formatAmount(entry.commission_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-gray-700">{formatAmount(entry.net_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {entry.type === 'credit' ? '+' : '−'}{formatAmount(entry.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{entry.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile compact card list */}
            <div className="md:hidden space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {(() => {
                          const users = getUsersForShop(String(entry.shop_id)) || [];
                          const u = users.find((us: User) => us.id === entry.farmer_id);
                          return u ? (u.username || u.firstname || `#${u.id}`) : `#${entry.farmer_id}`;
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'credit' ? '+' : '−'}₹{entry.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">{entry.category}</div>
                    </div>
                  </div>
                  {entry.notes && <div className="mt-2 text-xs text-gray-600">{entry.notes}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LedgerList;
