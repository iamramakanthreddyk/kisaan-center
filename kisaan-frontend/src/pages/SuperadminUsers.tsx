import { getUserDisplayName } from '../utils/userDisplayName';
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Edit, Trash2, RefreshCw, Key, Phone, AtSign, Wallet, Building } from 'lucide-react';
import { usersApi } from '../services/api';
import type { User } from '../types/api';
import { UserForm } from '../components/owner/UserForm';
import { useAuth } from '../context/AuthContext';
import { useIsMobile, useIsSmallMobile } from '../hooks/useMediaQuery';

const SuperadminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);
  const [expandedOwners, setExpandedOwners] = useState<{ [shopId: string]: boolean }>({});
  const toggleOwner = (shopId: number | string | undefined) => {
    const key = shopId !== undefined ? String(shopId) : 'unknown';
    setExpandedOwners(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const { user: currentUser } = useAuth();
  const [owners, setOwners] = useState<User[]>([]);
  const [usersByOwner, setUsersByOwner] = useState<{ [shopId: string]: User[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  // Responsive hooks
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();


  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
  const params: { limit: number; role?: string; status?: string } = { limit: 100 };
  if (filters.role) params.role = filters.role;
  if (filters.status) params.status = filters.status;
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      const response = await usersApi.getAll(params);
      if (response.data) {
        let filteredUsers = response.data;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(u => 
            u.username.toLowerCase().includes(searchLower) ||
            (u.contact && u.contact.includes(filters.search)) ||
            (u.email && u.email.toLowerCase().includes(searchLower))
          );
        }
        setUsers(filteredUsers);
        // Group by owner
        const owners = filteredUsers.filter(u => u.role === 'owner' && u.shop_id);
        setOwners(owners);
        // Group users by owner (shop_id as string key)
  const byOwner: { [shopId: string]: User[] } = {};
        owners.forEach(owner => {
          const key = owner.shop_id !== undefined ? String(owner.shop_id) : 'unknown';
          byOwner[key] = filteredUsers.filter(u => u.shop_id === owner.shop_id && u.role !== 'owner');
        });
        setUsersByOwner(byOwner);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserCreated = (user: User) => {
    setUsers(prev => [user, ...prev]);
    setShowCreateForm(false);
  };

  const handleUserUpdated = (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await usersApi.delete(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handlePasswordReset = async (userId: number, newPassword: string) => {
    try {
      const response = await usersApi.adminResetPassword(userId, newPassword);
      if (response && response.success) {
        alert('Password reset successfully');
        setShowPasswordReset(null);
      } else {
        alert((response && response.message) || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      superadmin: 'bg-red-100 text-red-800',
      owner: 'bg-orange-100 text-orange-800',
      farmer: 'bg-blue-100 text-blue-800',
      buyer: 'bg-purple-100 text-purple-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${amount.toLocaleString()}`;
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

  if (showPasswordReset) {
    return (
      <div className="p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Reset Password for {showPasswordReset.username}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const newPassword = formData.get('newPassword') as string;
              if (newPassword && newPassword.length >= 6) {
                handlePasswordReset(showPasswordReset.id, newPassword);
              } else {
                alert('Password must be at least 6 characters');
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    minLength={6}
                    required
                    placeholder="Enter new password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Reset Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPasswordReset(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 sm:space-y-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}> 
            Users Management
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage all platform users</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={fetchUsers}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {/* Desktop: icon + text; Mobile: icon only */}
            <span className="hidden sm:inline-flex items-center">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </span>
            <span className="inline-flex sm:hidden items-center">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </span>
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            size={isMobile ? "sm" : "default"}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSmallMobile ? "Add" : "Add User"}
          </Button>
        </div>
      </div>

      {/* Mobile Card Layout - Hidden on md and larger screens, paginated and compact */}
      <div className="block md:hidden space-y-3">
        {/* Show only owners and superadmins in mobile view */}
        {[...owners, ...users.filter(u => u.role === 'superadmin')].map((ownerOrAdmin) => {
          const shopKey = ownerOrAdmin.shop_id !== undefined ? String(ownerOrAdmin.shop_id) : 'unknown';
          const isOwner = ownerOrAdmin.role === 'owner';
          return (
            <React.Fragment key={ownerOrAdmin.id}>
              <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ownerOrAdmin.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} title={ownerOrAdmin.status}></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate text-base">{getUserDisplayName(ownerOrAdmin)}</h3>
                        <p className="text-xs text-gray-500">ID: #{ownerOrAdmin.id}</p>
                      </div>
                    </div>
                    <Badge className={`${getRoleColor(ownerOrAdmin.role)} text-xs font-medium`}>{ownerOrAdmin.role}</Badge>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => toggleOwner(shopKey)}
                        className="ml-2 rounded-full bg-white border border-orange-300 shadow-sm p-1.5 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                        aria-label={expandedOwners[shopKey] ? 'Collapse users' : 'Expand users'}
                        tabIndex={0}
                      >
                        {expandedOwners[shopKey] ? (
                          <ChevronDown className="w-5 h-5 text-orange-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-orange-500" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                    {ownerOrAdmin.contact && (
                      <div>
                        <span className="text-gray-500">Contact:</span>
                        <div className="font-medium text-gray-900 truncate">{ownerOrAdmin.contact}</div>
                      </div>
                    )}
                    {ownerOrAdmin.email && (
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <div className="font-medium text-gray-900 truncate">{ownerOrAdmin.email}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1" onClick={() => setEditingUser(ownerOrAdmin)}>
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700" onClick={() => setShowPasswordReset(ownerOrAdmin)}>
                      <Key className="w-4 h-4" />
                      Reset
                    </Button>
                    {/* Hide delete for owners and superadmins */}
                    {ownerOrAdmin.role !== 'owner' && ownerOrAdmin.role !== 'superadmin' && (
                      <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteUser(ownerOrAdmin.id)}>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Expanded users under owner */}
              {isOwner && expandedOwners[shopKey] && usersByOwner[shopKey] && usersByOwner[shopKey].length > 0 && (
                <div className="ml-4 mt-2 space-y-2">
                  {usersByOwner[shopKey].map((user) => (
                    <Card key={user.id} className="border border-orange-200">
                      <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} title={user.status}></div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate text-sm">{getUserDisplayName(user)}</h4>
                            <p className="text-xs text-gray-500">ID: #{user.id}</p>
                          </div>
                          <Badge className={`${getRoleColor(user.role)} text-xs font-medium`}>{user.role}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-1 text-xs">
                          {user.contact && (
                            <div>
                              <span className="text-gray-500">Contact:</span>
                              <div className="font-medium text-gray-900 truncate">{user.contact}</div>
                            </div>
                          )}
                          {user.email && (
                            <div>
                              <span className="text-gray-500">Email:</span>
                              <div className="font-medium text-gray-900 truncate">{user.email}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1" onClick={() => setEditingUser(user)}>
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700" onClick={() => setShowPasswordReset(user)}>
                            <Key className="w-4 h-4" />
                            Reset
                          </Button>
                          {/* Hide delete for owners and superadmins */}
                          {user.role !== 'owner' && user.role !== 'superadmin' && (
                            <Button size="sm" variant="outline" className="flex-1 flex items-center justify-center gap-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="hidden md:block">
        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}> 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={isSmallMobile ? "Search..." : "Search users..."}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select 
              value={filters.role || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === "all" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {currentUser?.role === 'superadmin' && (
                  <>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </>
                )}
                {currentUser?.role === 'owner' && (
                  <>
                    <SelectItem value="farmer">Farmer</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Select 
              value={filters.status || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
            >
              <SelectTrigger>
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

  {/* Users Tree Table */}
  <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({users.length})</span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {owners.length === 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shop ID</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>#{user.id}</TableCell>
                    <TableCell>{getUserDisplayName(user)}</TableCell>
                    <TableCell><Badge className={getRoleColor(user.role)}>{user.role}</Badge></TableCell>
                    <TableCell>{user.contact || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.shop_id ? `#${user.shop_id}` : '-'}</TableCell>
                    <TableCell>{formatCurrency(user.balance)}</TableCell>
                    <TableCell><Badge className={getStatusColor(user.status)}>{user.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowPasswordReset(user)} className="text-blue-600 hover:text-blue-700" title="Reset Password">
                          <Key className="w-4 h-4" />
                        </Button>
                        {/* Hide delete for owners and superadmins */}
                        {user.role !== 'owner' && user.role !== 'superadmin' && (
                          <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // ...existing code for owners with shop_id...
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shop ID</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => {
                  const shopKey = owner.shop_id !== undefined ? String(owner.shop_id) : 'unknown';
                  const users = usersByOwner[shopKey] || [];
                  return (
                    <React.Fragment key={owner.id}>
                      <TableRow className="bg-orange-50 group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {users.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleOwner(shopKey)}
                                className="rounded-full bg-white border border-orange-300 shadow-sm p-1.5 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                                aria-label={expandedOwners[shopKey] ? 'Collapse users' : 'Expand users'}
                                tabIndex={0}
                              >
                                {expandedOwners[shopKey] ? (
                                  <ChevronDown className="w-6 h-6 text-orange-500" />
                                ) : (
                                  <ChevronRight className="w-6 h-6 text-orange-500" />
                                )}
                              </button>
                            ) : null}
                            <span className="font-mono text-base">#{owner.id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">{owner.firstname && owner.firstname.trim() ? owner.firstname : owner.username}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(owner.role)}>{owner.role}</Badge>
                        </TableCell>
                        <TableCell>{owner.contact || '-'}</TableCell>
                        <TableCell>{owner.email || '-'}</TableCell>
                        <TableCell>{owner.shop_id ? `#${owner.shop_id}` : '-'}</TableCell>
                        <TableCell>{formatCurrency(owner.balance)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(owner.status)}>{owner.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setEditingUser(owner); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setShowPasswordReset(owner); }} className="text-blue-600 hover:text-blue-700" title="Reset Password">
                              <Key className="w-4 h-4" />
                            </Button>
                            {/* Hide delete for owners and superadmins */}
                            {owner.role !== 'owner' && owner.role !== 'superadmin' && (
                              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleDeleteUser(owner.id); }} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Render users under this owner if expanded */}
                      {expandedOwners[shopKey] && users.length > 0 &&
                        users.map((user: typeof owners[number]) => (
                          <TableRow key={user.id} className="bg-white border-l-4 border-l-orange-300">
                            <TableCell>#{user.id}</TableCell>
                            <TableCell className="pl-8">{getUserDisplayName(user)}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                            </TableCell>
                            <TableCell>{user.contact || '-'}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>{user.shop_id ? `#${user.shop_id}` : '-'}</TableCell>
                            <TableCell>{formatCurrency(user.balance)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setShowPasswordReset(user)} className="text-blue-600 hover:text-blue-700" title="Reset Password">
                                  <Key className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminUsers;