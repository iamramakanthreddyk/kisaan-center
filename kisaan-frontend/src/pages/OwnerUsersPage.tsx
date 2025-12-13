
import { getUserDisplayName } from '../utils/userDisplayName';
import React, { useState } from 'react';

import { useFarmerProductAssignment } from '../services/hooks/useFarmerProductAssignment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeClass } from '@/utils/getRoleBadgeClass';
import { formatCurrency } from '@/utils/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, RefreshCw } from 'lucide-react';

import type { User } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { UserForm } from '../components/owner/UserForm';
import { useUsers } from '../context/useUsers';

// Simple error boundary for context errors
class ContextErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: 'red', padding: 24 }}>
          <h2>Context Error</h2>
          <pre>{
            this.state.error && typeof this.state.error === 'object' && 'message' in this.state.error
              ? (this.state.error as { message: string }).message
              : String(this.state.error)
          }</pre>
          <p>
            This page requires AuthProvider and UsersProvider to be present in the React tree.<br />
            Please ensure you are not rendering this page outside the main App layout.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}



const OwnerUsersPage: React.FC = () => {
  // Wrap hooks in error boundary to catch context errors
  return (
    <ContextErrorBoundary>
      <OwnerUsersPageInner />
    </ContextErrorBoundary>
  );
};

const OwnerUsersPageInner: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { users, isLoading, refreshUsers, page, setPage, pageSize, total, allUsers, allUsersFetched } = useUsers();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Modal state for assigning products
  const [assignProductsUser, setAssignProductsUser] = useState<User | null>(null);
  const {
    shopProducts,
    selectedProductIds,
    setSelectedProductIds,
    assignLoading,
    fetchProductsForFarmer,
    handleAssignProducts
  } = useFarmerProductAssignment(currentUser?.shop_id, assignProductsUser?.id, () => {
    setAssignProductsUser(null);
    refreshUsers();
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });


  // If all users are fetched, filter and paginate locally from allUsers
  let filteredUsers = users;
  if (allUsersFetched) {
    let localFiltered = allUsers;
    if (filters.role) {
      localFiltered = localFiltered.filter(u => u.role === filters.role);
    }
    if (filters.status) {
      localFiltered = localFiltered.filter(u => u.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      localFiltered = localFiltered.filter(u =>
        (u.firstname && u.firstname.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.contact && u.contact.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    filteredUsers = localFiltered.slice((page - 1) * pageSize, page * pageSize);
  }



  // When filters change, reset to page 1
  React.useEffect(() => {
    setPage(1);
  }, [filters.role, filters.status, filters.search]);

  // When page, pageSize, or filters/search change, fetch from backend
  React.useEffect(() => {
    if (!allUsersFetched) {
      refreshUsers();
    }
    // else: do not call refreshUsers, just paginate locally
  }, [page, pageSize, filters.role, filters.status, filters.search, allUsersFetched]);

  const handleUserCreated = () => {
    refreshUsers();
    setShowCreateForm(false);
  };

  const handleUserUpdated = () => {
    refreshUsers();
    setEditingUser(null);
  };



  if (showCreateForm) {
    return (
      <div className="p-6">
        <UserForm 
          onSuccess={handleUserCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (editingUser) {
    return (
      <div className="p-6">
        <UserForm 
          editUser={editingUser}
          onSuccess={handleUserUpdated}
          onCancel={() => setEditingUser(null)}
        />
      </div>
    );
  }
  return (
    <>
  <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-6 space-y-4 sm:space-y-6">
      {/* Header */}
  <div className="flex flex-col sm:flex-row w-full mb-2 items-start sm:items-center gap-2">
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Users Management</h1>
          <p className="text-gray-600 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">Manage farmers, buyers and other users</p>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <Button 
            onClick={() => refreshUsers()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="px-2 py-1 text-xs sm:text-sm"
            style={{ minWidth: 0 }}
          >
            {/* Desktop: icon + text; Mobile: icon only */}
            <span className="hidden xs:inline-flex items-center">
              <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </span>
            <span className="inline-flex xs:hidden items-center">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </span>
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="px-2 py-1 text-xs sm:text-sm bg-green-600 hover:bg-green-700" size="sm" style={{ minWidth: 0 }}>
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Add User</span>
            <span className="inline xs:hidden">+</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 text-sm"
              />
            </div>
            <Select 
              value={filters.role || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="farmer">Farmer</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.status || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-base sm:text-lg gap-2">
            <span>Users ({total})</span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
                {filteredUsers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 text-base sm:text-lg">No users found</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">
                {filters.search || filters.role || filters.status
                  ? 'Try adjusting your filters'
                  : 'Add your first user to get started'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table className="min-w-[600px] w-full text-xs sm:text-sm whitespace-normal break-words">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID / Status</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            #{user.id}
                            <span className={user.status === 'active' ? 'inline-block w-2.5 h-2.5 rounded-full bg-green-500' : 'inline-block w-2.5 h-2.5 rounded-full bg-red-500'} title={user.status}></span>
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(user.balance)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {/* No delete button: user cannot be deleted, only status can be changed */}
                            {/* Assign Products button for farmers only */}
                            {user.role === 'farmer' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => {
                                  setAssignProductsUser(user);
                                  fetchProductsForFarmer(user.id);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Assign Products
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination Controls removed; only new pagination remains */}
              </div>
              {/* Mobile Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 w-full justify-center">
                    <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-2 border rounded disabled:opacity-50">Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-2 border rounded ${page === i + 1 ? 'bg-blue-600 text-white font-bold border-blue-600' : 'bg-white text-gray-800'} ${page === i + 1 ? '' : 'hover:bg-gray-100'} transition-colors`}
                        style={{ minWidth: 36 }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
              {/* Mobile Card/List Layout */}
              <div className="block sm:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border p-2 bg-white shadow-sm w-full max-w-full mx-auto">
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="font-semibold text-sm break-words truncate max-w-[60%]">{getUserDisplayName(user)}</span>
                        <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 items-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingUser(user)}
                          className="px-2 py-1 text-xs"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* No delete button: user cannot be deleted, only status can be changed */}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1 break-words">ID: #{user.id} <span className={user.status === 'active' ? 'inline-block w-2 h-2 rounded-full bg-green-500 ml-1' : 'inline-block w-2 h-2 rounded-full bg-red-500 ml-1'} title={user.status}></span></div>
                    <div className="flex flex-wrap gap-1 text-xs mb-1">
                      <div className="break-words max-w-[48%]"><span className="font-medium">Balance:</span> {formatCurrency(user.balance)}</div>
                    </div>
                    {/* Assign Products button for farmers only (mobile) */}
                    {user.role === 'farmer' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        onClick={() => {
                          setAssignProductsUser(user);
                          fetchProductsForFarmer(user.id);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Assign Products
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Product Assignment Modal */}
      {assignProductsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Assign Products to {getUserDisplayName(assignProductsUser)}</h2>
            <div className="mb-4">
              <div className="text-sm mb-2">Select products to assign:</div>
              <div className="max-h-48 overflow-y-auto border rounded p-2">
                {shopProducts.length === 0 ? (
                  <div className="text-gray-500">No products available</div>
                ) : (
                  shopProducts.map((prod: { id: number; product_name?: string; name?: string }) => (
                    <label key={prod.id} className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(prod.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedProductIds((prev: number[]) => [...prev, prod.id]);
                          } else {
                            setSelectedProductIds((prev: number[]) => prev.filter(id => id !== prod.id));
                          }
                        }}
                      />
                      <span>
                        {prod.product_name || prod.name || ''}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignProductsUser(null)} disabled={assignLoading}>Cancel</Button>
              <Button onClick={() => handleAssignProducts(assignProductsUser?.id, selectedProductIds)} disabled={assignLoading || selectedProductIds.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
                {assignLoading ? 'Assigning...' : 'Assign Selected'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default OwnerUsersPage;
