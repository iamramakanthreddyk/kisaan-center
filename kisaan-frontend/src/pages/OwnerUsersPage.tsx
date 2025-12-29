
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-2 sm:p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <UserForm
            onSuccess={handleUserCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      </div>
    );
  }

  if (editingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-2 sm:p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <UserForm
            editUser={editingUser}
            onSuccess={handleUserUpdated}
            onCancel={() => setEditingUser(null)}
          />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-6 space-y-3 sm:space-y-4 lg:space-y-6 pb-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 lg:p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Users Management</h1>
                <p className="text-gray-600 text-sm sm:text-base">Manage farmers, buyers and other users</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => refreshUsers()}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>

      {/* Filters */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-2 border-b border-blue-100 bg-white/60 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base font-semibold text-blue-900">Search & Filter Users</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, contact, email..."
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
                <SelectItem value="farmer">👨‍🌾 Farmer</SelectItem>
                <SelectItem value="buyer">🛒 Buyer</SelectItem>
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
                <SelectItem value="active">✅ Active</SelectItem>
                <SelectItem value="inactive">❌ Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b border-blue-100 bg-white/60 rounded-t-xl">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-base sm:text-lg gap-2">
            <span className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              Users ({total})
            </span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-500 text-base sm:text-lg font-medium">No users found</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">
                {filters.search || filters.role || filters.status
                  ? 'Try adjusting your filters or search terms'
                  : 'Add your first user to get started'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table className="w-full text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="font-semibold text-blue-900">ID / Status</TableHead>
                      <TableHead className="font-semibold text-blue-900">User Details</TableHead>
                      <TableHead className="font-semibold text-blue-900">Role</TableHead>
                      {/* <TableHead className="font-semibold text-blue-900">Balance</TableHead> */}
                      <TableHead className="font-semibold text-blue-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-blue-25">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-600">#{user.id}</span>
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              title={user.status}
                            ></span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-gray-900">{getUserDisplayName(user)}</span>
                            {user.contact && (
                              <span className="text-xs text-gray-500">{user.contact}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getRoleBadgeClass(user.role)} font-medium`}
                          >
                            {user.role === 'farmer' ? '👨‍🌾' : user.role === 'buyer' ? '🛒' : '👤'} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        {/* <TableCell className="font-medium text-green-600">
                          {formatCurrency(user.balance)}
                        </TableCell> */}
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(user)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="hidden lg:inline">Edit</span>
                            </Button>
                            {/* Assign Products button for farmers only */}
                            {user.role === 'farmer' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                                onClick={() => {
                                  setAssignProductsUser(user);
                                  fetchProductsForFarmer(user.id);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                <span className="hidden lg:inline">Assign Products</span>
                                <span className="lg:hidden">Products</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                      className="px-2 sm:px-3"
                    >
                      ← Prev
                    </Button>

                    {/* Mobile: Show fewer page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Mobile: Simple current/total display */}
                    <div className="sm:hidden flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                      <span className="text-sm font-medium">{page} / {totalPages}</span>
                    </div>

                    <Button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                      className="px-2 sm:px-3"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Card/List Layout */}
              <div className="block sm:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`} title={user.status}></div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate text-base">
                              {getUserDisplayName(user)}
                            </h3>
                            <p className="text-sm text-gray-500">ID: #{user.id}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getRoleBadgeClass(user.role)} text-xs font-medium`}
                        >
                          {user.role === 'farmer' ? '👨‍🌾' : user.role === 'buyer' ? '🛒' : '👤'} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        {/*
                        <div>
                          <span className="text-gray-500">Balance:</span>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(user.balance)}
                          </div>
                        </div>
                        */}
                        {user.contact && (
                          <div>
                            <span className="text-gray-500">Contact:</span>
                            <div className="font-medium text-gray-900 truncate">
                              {user.contact}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(user)}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        {user.role === 'farmer' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2"
                            onClick={() => {
                              setAssignProductsUser(user);
                              fetchProductsForFarmer(user.id);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            Products
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Product Assignment Modal */}
      {assignProductsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">📦</span>
                Assign Products
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Assign products to {getUserDisplayName(assignProductsUser)}
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select products to assign:
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {shopProducts.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      <span className="text-2xl mb-2 block">📭</span>
                      No products available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shopProducts.map((prod: { id: number; product_name?: string; name?: string }) => (
                        <label key={prod.id} className="flex items-center gap-3 p-2 rounded hover:bg-white cursor-pointer">
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
                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {prod.product_name || prod.name || ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setAssignProductsUser(null)}
                  disabled={assignLoading}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAssignProducts(assignProductsUser?.id, selectedProductIds)}
                  disabled={assignLoading || selectedProductIds.length === 0}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {assignLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Assign Selected ({selectedProductIds.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default OwnerUsersPage;
