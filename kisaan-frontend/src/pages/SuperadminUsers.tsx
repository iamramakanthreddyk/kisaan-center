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
  const [expandedOwners, setExpandedOwners] = useState<{ [shopId: string]: boolean }>({});
  const toggleOwner = (shopId: number | string | undefined) => {
    const key = shopId !== undefined ? String(shopId) : 'unknown';
    setExpandedOwners(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
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

      {/* Mobile Card Layout - Hidden on md and larger screens */}
      <div className="block md:hidden space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm bg-white w-full max-w-full">
            <CardContent className="p-4 w-full max-w-full">
              {/* Header with user info and status */}
              <div className="flex items-start justify-between mb-4 w-full max-w-full">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xl truncate text-gray-900 w-full max-w-full">{getUserDisplayName(user)}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1 truncate w-full max-w-full">ID #{user.id}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                  <Badge className={`${getRoleColor(user.role)} text-xs px-2 py-0.5 rounded`}>{user.role}</Badge>
                  <Badge className={`${getStatusColor(user.status)} text-xs px-2 py-0.5 rounded`}>{user.status}</Badge>
                </div>
              </div>
              <div className="border-t border-gray-100 my-2"></div>
              {/* Contact info with icons */}
              <div className="space-y-2 mb-4 w-full max-w-full">
                {user.contact && (
                  <div className="flex items-center gap-2 text-base w-full max-w-full">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium break-all w-full max-w-full">{user.contact}</span>
                  </div>
                )}
                {user.email && (
                  <div className="flex items-center gap-2 text-base w-full max-w-full">
                    <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium break-all truncate w-full max-w-[140px]">{user.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-base w-full max-w-full">
                  <Wallet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{formatCurrency(user.balance)}</span>
                </div>
                {user.shop_id && (
                  <div className="flex items-center gap-2 text-base w-full max-w-full">
                    <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">Shop #{user.shop_id}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 my-2"></div>
              {/* Action buttons - stacked for mobile */}
              <div className="grid grid-cols-2 gap-2 pt-2 w-full max-w-full">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs py-2"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                  {!isSmallMobile && <span className="ml-1">View</span>}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEditingUser(user)}
                  className="w-full text-xs py-2"
                  title="Edit User"
                >
                  <Edit className="w-4 h-4" />
                  {!isSmallMobile && <span className="ml-1">Edit</span>}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowPasswordReset(user)}
                  className="w-full text-xs py-2 text-blue-600 hover:text-blue-700"
                  title="Reset Password"
                >
                  <Key className="w-4 h-4" />
                  {!isSmallMobile && <span className="ml-1">Reset</span>}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleDeleteUser(user.id)}
                  className="w-full text-xs py-2 text-red-600 hover:text-red-700"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                  {!isSmallMobile && <span className="ml-1">Delete</span>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
                        <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleDeleteUser(owner.id); }} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
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