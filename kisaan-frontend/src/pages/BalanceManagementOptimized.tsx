import { getUserDisplayWithRoleAndId } from '../utils/userDisplayName';

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeClass } from '@/utils/getRoleBadgeClass';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// NEW: Import centralized data hooks
import { useShopUsers } from '../hooks/useShopData';
import { balanceSnapshotsApi } from '../services/api';

import type { User } from '../types/api';

interface BalanceManagementProps {
  shopId: number;
}

const BalanceManagement: React.FC<BalanceManagementProps> = ({ shopId }) => {
  // const { isAuthenticated } = useAuth(); // Unused
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  interface BalanceSnapshot {
    id: number | string;
    user_id: number;
    previous_balance: number;
    new_balance: number;
    amount_change: number | string;
    created_at: string;
    [key: string]: unknown;
  }
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  // NEW: Use centralized user data hook instead of manual fetching
  const { 
    data: allUsers = [], 
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers 
  } = useShopUsers(shopId);

  // Filter users to only farmers and buyers with proper typing
  const users = React.useMemo(() => {
    return (allUsers as User[])
      .filter((u) => ['farmer', 'buyer'].includes(u.role));
  }, [allUsers]);

  // Pagination state for All Users Balance Overview table
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(users.length / pageSize);
  const pagedUsers = users.slice((page - 1) * pageSize, page * pageSize);

  // Fetch balance snapshots for selected user
  useEffect(() => {
    if (!selectedUser) {
      setSnapshots([]);
      return;
    }
    setSnapshotsLoading(true);
    balanceSnapshotsApi.getByUserId(selectedUser.id)
      .then((data) => setSnapshots(data.map(s => ({ ...s, id: String(s.id) }))))
      .catch(() => setSnapshots([]))
      .finally(() => setSnapshotsLoading(false));
  }, [selectedUser]);

  // Error handling
  if (usersError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold mb-4">Balance Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Users</h3>
          <p className="text-red-600 text-sm mt-1">{usersError.message}</p>
          <Button 
            onClick={() => refetchUsers()} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-4">Balance Management</h1>
        <Button
          onClick={() => refetchUsers()}
          variant="outline"
          size="sm"
          disabled={usersLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <strong>Instructions:</strong> View balances for all users. To record or manage payments, use the <b>Payments</b> page.
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{whiteSpace: 'nowrap'}}>Select User:</span>
          <Select
            value={selectedUser ? String(selectedUser.id) : ''}
            onValueChange={val => {
              const user = users.find(u => String(u.id) === val);
              setSelectedUser(user || null);
            }}
            disabled={usersLoading}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a user"} />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={String(user.id)}>
                  <div className="flex items-center gap-2">
                    <span>{getUserDisplayWithRoleAndId(user)}</span>
                    <Badge className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {users.length > 0 && (
          <div className="text-sm text-gray-600">
            {users.length} users loaded • {users.filter(u => u.role === 'farmer').length} farmers • {users.filter(u => u.role === 'buyer').length} buyers
          </div>
        )}
      </div>

      {/* All Users Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            All Users Balance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found for this shop
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map(user => (
                      <TableRow 
                        key={user.id}
                        className={selectedUser?.id === user.id ? 'bg-blue-50' : ''}
                      >
                        <TableCell className="font-medium">
                          {getUserDisplayWithRoleAndId(user)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeClass(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {user.contact || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={user.balance < 0 ? 'text-red-600' : user.balance > 0 ? 'text-green-600' : 'text-gray-600'}>
                            ₹{user.balance?.toFixed(2) || '0.00'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.balance < 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Owes ₹{Math.abs(user.balance).toFixed(2)}
                            </Badge>
                          ) : user.balance > 0 ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Credit ₹{user.balance.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Settled
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected User Balance History */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              Balance History - {getUserDisplayWithRoleAndId(selectedUser)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading balance history...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No balance changes found for this user
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Previous Balance</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">New Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snapshot, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(snapshot.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{String((snapshot as { description?: string }).description) || 'Balance update'}</TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{parseFloat(String(snapshot.previous_balance || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            parseFloat(String(snapshot.amount_change)) > 0
                              ? 'text-green-600' 
                              : parseFloat(String(snapshot.amount_change)) < 0
                                ? 'text-red-600' 
                                : 'text-gray-600'
                          }>
                            {parseFloat(String(snapshot.amount_change)) > 0 ? '+' : ''}
                            ₹{parseFloat(String(snapshot.amount_change || 0)).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{parseFloat(String(snapshot.new_balance || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Users with Negative Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.balance < 0).length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{users.reduce((sum, u) => sum + (u.balance < 0 ? Math.abs(u.balance) : 0), 0).toFixed(2)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BalanceManagement;