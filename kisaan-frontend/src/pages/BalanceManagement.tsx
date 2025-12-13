import { getUserDisplayWithRoleAndId } from '../utils/userDisplayName';

import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../utils/formatDate';
import { balanceSnapshotsApi, paymentsApi, balanceApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSearchDropdown } from '@/components/ui/UserSearchDropdown';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeClass } from '@/utils/getRoleBadgeClass';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BalanceCard } from '@/components/BalanceCard';
import { BalanceSummary } from '@/components/BalanceSummary';
import { Wallet, History, ArrowUpDown, ArrowUp, ArrowDown, Receipt, CreditCard, DollarSign, Minus, Plus, Filter, TrendingUp } from 'lucide-react';
import type { User, BalanceSnapshot as SharedBalanceSnapshot, Payment } from '../types/api';
import { useUsers } from '../context/useUsers';

interface BalanceManagementProps {
  shopId: number;
}

const BalanceManagement: React.FC<BalanceManagementProps> = () => {
  const { allUsers, users } = useUsers();
  // Pagination state for User Amounts Owed table
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(allUsers.length / pageSize);
  const pagedUsers = allUsers.slice((page - 1) * pageSize, page * pageSize);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserBalance, setSelectedUserBalance] = useState<{
    current_balance: number;
    pending_expenses: number;
    effective_balance?: number;
    balance_meaning?: string;
  } | null>(null);
  // Extend shared BalanceSnapshot type to allow for string id and index signature if needed
  type BalanceSnapshot = Omit<SharedBalanceSnapshot, 'id'> & {
    id: string;
    [key: string]: string | number | undefined;
  };
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  
  // Filtering and search state
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Helper functions for transaction visualization
  const getTransactionTypeIcon = (transactionType: string) => {
    switch (transactionType?.toLowerCase()) {
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'expense': return <Receipt className="h-4 w-4" />;
      case 'transaction': return <DollarSign className="h-4 w-4" />;
      case 'adjustment': return <ArrowUpDown className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getTransactionTypeColor = (transactionType: string) => {
    switch (transactionType?.toLowerCase()) {
      case 'payment': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expense': return 'bg-red-100 text-red-800 border-red-200';
      case 'transaction': return 'bg-green-100 text-green-800 border-green-200';
      case 'adjustment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filtered snapshots based on current filters
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter(snapshot => {
      const matchesTransactionType = transactionTypeFilter === 'all' || snapshot.transaction_type === transactionTypeFilter;
      const matchesBalanceType = balanceTypeFilter === 'all' || snapshot.balance_type === balanceTypeFilter;
      const matchesSearch = searchTerm === '' || 
        snapshot.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snapshot.transaction_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snapshot.reference_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesTransactionType && matchesBalanceType && matchesSearch;
    });
  }, [snapshots, transactionTypeFilter, balanceTypeFilter, searchTerm]);



  // Fetch balance snapshots for selected user
  useEffect(() => {
    if (!selectedUser) {
      setSnapshots([]);
      setPayments([]);
      setSelectedUserBalance(null);
      return;
    }
    setSnapshotsLoading(true);
    setPaymentsLoading(true);
    
    // Fetch snapshots
    balanceSnapshotsApi.getByUserId(selectedUser.id)
      .then((data) => setSnapshots(data.map(s => ({ ...s, id: String(s.id) }))))
      .catch(() => setSnapshots([]))
      .finally(() => setSnapshotsLoading(false));
    
    // Fetch payment history
    paymentsApi.getAll({})
      .then((res) => {
        // Filter payments for this user (either as payer or payee)
        const userPayments = (res.data || []).filter((p: Payment) =>
          p.counterparty_id !== null && p.counterparty_id !== undefined &&
          Number(p.counterparty_id) === Number(selectedUser.id)
        );
        setPayments(userPayments);
      })
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));

    // Fetch API canonical balance for selected user (preferred source)
    balanceApi.getUserBalance(Number(selectedUser.id))
      .then((resp) => {
        const d = resp.data;
        if (d) {
          setSelectedUserBalance({
            current_balance: Number(d.current_balance || 0),
            pending_expenses: Number(d.pending_expenses || 0),
            effective_balance: Number(d.effective_balance ?? d.current_balance ?? 0)
          });
        } else {
          setSelectedUserBalance(null);
        }
      })
      .catch(() => setSelectedUserBalance(null));
  }, [selectedUser]);
  // Always show as amount owed (red or gray only)
  // Removed unused getBalanceColor function

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-4">Balance Management</h1>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <strong>Instructions:</strong> View balances for all users. To record or manage payments, use the <b>Payments</b> page.
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{whiteSpace: 'nowrap'}}>Select User:</span>
          <div style={{ minWidth: 220 }}>
            <UserSearchDropdown
              onSelect={user => setSelectedUser(user)}
              placeholder="Search user..."
            />
          </div>
        </div>
        {selectedUser && (
          <div className="flex items-center gap-4 flex-1">
            <BalanceCard
              userName={getUserDisplayWithRoleAndId(selectedUser)}
              userRole={selectedUser.role as 'farmer' | 'buyer' | 'shop_owner'}
              balance={selectedUserBalance?.current_balance ?? selectedUser.balance ?? 0}
              lastUpdated={selectedUserBalance ? new Date() : undefined}
              showDetails={false}
              className="w-full"
            />
          </div>
        )}
      </div>
      {selectedUser && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Balance History & Changes</CardTitle>
            <div className="text-sm text-gray-600">
              Track how this user's balance has changed over time. Each entry shows a transaction that affected their balance,
              with positive changes (green) indicating money received/owed less, and negative changes (red) indicating money paid/owed more.
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtering and Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="expense">Expense</option>
                  <option value="transaction">Transaction</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Balance Type</label>
                <select
                  value={balanceTypeFilter}
                  onChange={(e) => setBalanceTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Balances</option>
                  <option value="farmer">Farmer Balance</option>
                  <option value="buyer">Buyer Balance</option>
                </select>
              </div>
            </div>

            {snapshotsLoading ? (
              <div>Loading snapshots...</div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {snapshots.length === 0 ? 'No balance changes to display.' : 'No transactions match your filters.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Balance Type</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>New Balance</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSnapshots.map(s => {
                    let dateStr = '';
                    if (s.created_at) {
                      dateStr = formatDate(s.created_at);
                    }
                    function safeNumber(val: number | string) {
                      const n = typeof val === 'number' ? val : parseFloat(val as string);
                      return isNaN(n) ? 0 : n;
                    }
                    const prev = safeNumber(s.previous_balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    const change = safeNumber(s.amount_change);
                    const changeStr = `${change >= 0 ? '+' : ''}${change.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    const next = safeNumber(s.new_balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

                    // Enhanced transaction description with icons
                    const transactionDesc = s.transaction_type || 'Unknown';
                    const transactionIcon = getTransactionTypeIcon(s.transaction_type || '');

                    // Determine change type styling with icons
                    const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
                    const changeIcon = change > 0 ? <Plus className="h-3 w-3 inline mr-1" /> : change < 0 ? <Minus className="h-3 w-3 inline mr-1" /> : null;

                    return (
                      <TableRow key={s.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{dateStr}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transactionIcon}
                            <div>
                              <div className="font-medium">{transactionDesc}</div>
                              {s.reference_id && (
                                <div className="text-xs text-gray-500">
                                  {s.reference_type} #{s.reference_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(s.transaction_type || '')}>
                            {s.transaction_type || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={s.balance_type === 'farmer' ? 'border-blue-500 text-blue-700' : 'border-green-500 text-green-700'}>
                            {s.balance_type === 'farmer' ? 'Farmer' : 'Buyer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">₹{prev}</TableCell>
                        <TableCell className={`font-medium font-mono ${changeColor}`}>
                          {changeIcon}₹{changeStr}
                        </TableCell>
                        <TableCell className="font-medium font-mono">₹{next}</TableCell>
                        <TableCell>
                          {s.description ? (
                            <div className="text-xs text-gray-600 max-w-[200px] truncate" title={s.description}>
                              {s.description}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No details</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Settlement History - Recent Payments */}
      {selectedUser && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payment History & Settlements
            </CardTitle>
            <div className="text-sm text-gray-600">
              Recent payments made to or by this user, showing how they affected the balance.
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div>Loading payment history...</div>
            ) : payments.length === 0 ? (
              <div>No payment history found for this user.</div>
            ) : (
              <>
                {/* Payment Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{payments.length}</div>
                    <div className="text-sm text-gray-600">Total Payments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{payments.reduce((sum, p) => sum + (p.applied_to_expenses || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Applied to Expenses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{payments.reduce((sum, p) => sum + (p.applied_to_balance || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Applied to Balance</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Settlement Breakdown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.slice(0, 10).map((payment) => {
                      const payeeType = String(payment.payee_type || '').toLowerCase();
                      const isIncoming = payeeType === 'farmer' && selectedUser?.role === 'farmer';
                      const directionIcon = isIncoming ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />;
                      const directionText = isIncoming ? 'Received' : 'Sent';
                      
                      return (
                        <TableRow key={payment.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{formatDate(payment.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {directionIcon}
                              <Badge variant="outline" className={`text-xs ${isIncoming ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
                                {directionText}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium font-mono">₹{Number(payment.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {payment.method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.applied_to_expenses || payment.applied_to_balance ? (
                              <div className="space-y-2">
                                {payment.applied_to_expenses && payment.applied_to_expenses > 0 && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Receipt className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600 font-medium">
                                      Expenses: ₹{payment.applied_to_expenses.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {payment.applied_to_balance && payment.applied_to_balance > 0 && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Wallet className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-600 font-medium">
                                      Balance: ₹{payment.applied_to_balance.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {payment.fifo_result && (
                                  <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded">
                                    Settlement details available
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No breakdown available</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Summary Cards - Only Receivables and Payables */}
      <BalanceSummary
        totalReceivables={users.filter(u => u.role === 'buyer' && u.balance > 0).reduce((sum, u) => sum + u.balance, 0)}
        totalPayables={allUsers.filter(u => u.role === 'farmer' && u.balance > 0).reduce((sum, u) => sum + u.balance, 0)}
        totalUsers={allUsers.length}
        farmersCount={allUsers.filter(u => u.role === 'farmer').length}
        buyersCount={allUsers.filter(u => u.role === 'buyer').length}
      />

      {/* Enhanced Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Position</p>
                <p className={`text-2xl font-bold ${allUsers.reduce((sum, u) => sum + u.balance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(allUsers.reduce((sum, u) => sum + u.balance, 0)).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {allUsers.reduce((sum, u) => sum + u.balance, 0) >= 0 ? 'Shop is owed money' : 'Shop owes money'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Balances</p>
                <p className="text-2xl font-bold text-orange-600">
                  {allUsers.filter(u => Math.abs(u.balance) > 0).length}
                </p>
                <p className="text-xs text-gray-500">Users with outstanding balances</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-teal-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Farmers with Credit</p>
                <p className="text-2xl font-bold text-teal-600">
                  {allUsers.filter(u => u.role === 'farmer' && u.balance > 0).length}
                </p>
                <p className="text-xs text-gray-500">Farmers owed money by shop</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Buyers with Debt</p>
                <p className="text-2xl font-bold text-purple-600">
                  {allUsers.filter(u => u.role === 'buyer' && u.balance > 0).length}
                </p>
                <p className="text-xs text-gray-500">Buyers owing money to shop</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

  {/* Users Table - All balances shown as amount owed */}
  <div className="mb-2 text-sm text-gray-500">Debug: allUsers.length = {allUsers.length}</div>
      <Card>
        <CardHeader>
          <CardTitle>User Amounts Owed</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount Owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {getUserDisplayWithRoleAndId(user)}
                    <Badge variant="outline" className={`ml-2 ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold text-red-600`}>
                      ₹{Math.abs(user.balance).toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination controls: always show page number(s) */}
          <div className="flex justify-end items-center gap-2 mt-4">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            {/* Numbered page buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                className={`px-3 py-1 border rounded ${pg === page ? 'bg-blue-600 text-white font-bold' : ''}`}
                onClick={() => setPage(pg)}
                disabled={pg === page}
              >
                {pg}
              </button>
            ))}
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Last
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceManagement;