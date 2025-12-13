import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus } from 'lucide-react';
import { usersApi, shopsApi } from '../../services/api';
import { commissionsApi } from '../../services/api';
import type { UserCreate, User } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { toastService } from '../../services/toastService';

interface UserFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
  editUser?: User | null;
}

export const UserForm: React.FC<UserFormProps> = ({ onSuccess, onCancel, editUser }) => {
  const [contactError, setContactError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserCreate & { status?: 'active' | 'inactive' }>({
    role: editUser?.role || (currentUser?.role === 'superadmin' ? 'owner' : 'farmer'),
    shop_id: editUser?.shop_id || (currentUser?.role === 'owner' ? currentUser?.shop_id : undefined),
    contact: typeof editUser?.contact === 'string' ? editUser.contact : '',
    firstname: editUser?.firstname || '',
    password: editUser?.password || (currentUser?.role === 'superadmin' ? '' : 'kisaan@123'),
    email: editUser?.email || (currentUser?.role === 'superadmin' ? '' : 'contact@kisaancenter.com'),
    username: editUser?.username || '',
    balance: editUser?.balance || 0,
    custom_commission_rate: editUser?.custom_commission_rate || undefined,
    status: editUser?.status || 'active',
  });

  useEffect(() => {
    if (!editUser && formData.shop_id && (formData.custom_commission_rate === undefined || formData.custom_commission_rate === null)) {
      let isMounted = true;
      const fetchCommission = async () => {
        if (!formData.shop_id) return;
        if (formData.role === 'farmer') {
          try {
            const commissions = await commissionsApi.getByShopId(formData.shop_id);
            if (isMounted && Array.isArray(commissions) && commissions.length > 0) {
              const commission = commissions[0];
              if (commission && commission.rate) {
                setFormData(prev => ({ ...prev, custom_commission_rate: Number(commission.rate) }));
                return;
              }
            }
          } catch {
            // ignore error
          }
        }
        try {
          if (!formData.shop_id) return;
          const resp = await shopsApi.getById(formData.shop_id);
          if (isMounted && resp) {
            const commissionRate = resp.data?.commission_rate;
            if (typeof commissionRate === 'number') {
              setFormData(prev => ({ ...prev, custom_commission_rate: commissionRate }));
            }
          }
        } catch {
          // ignore error
        }
      };
      fetchCommission();
      return () => { isMounted = false; };
    }
  }, [editUser, formData.role, formData.shop_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (formData.contact && formData.contact.length > 0 && formData.contact.length < 10) {
      setContactError('Contact number must be at least 10 digits');
      return;
    } else {
      setContactError(null);
    }
    e.preventDefault();

    if (!editUser && !formData.firstname) {
      setFormError('Please enter first name');
      return;
    }

    if (currentUser?.role === 'superadmin') {
      if (!formData.email) {
        setFormError('Email is required for superadmin user creation');
        return;
      }
      if (!editUser && (!formData.password || formData.password.length < 6)) {
        setFormError('Password must be at least 6 characters long');
        return;
      }
      if (editUser && formData.password && formData.password.length < 6) {
        setFormError('Password must be at least 6 characters long');
        return;
      }
    }

    setIsLoading(true);
    setFormError(null);
    try {
      let response;
      if (editUser) {
        const changedFields: Partial<UserCreate> = {};
        (Object.keys(formData) as Array<keyof UserCreate>).forEach(key => {
          const value = formData[key];
          if (value !== undefined && (!editUser || value !== editUser[key])) {
            (changedFields as Record<string, unknown>)[key] = value;
          }
        });
        if ('role' in changedFields) {
          delete changedFields.role;
        }
        if (Object.keys(changedFields).length === 0) {
          setFormError('No changes detected. User not updated.');
          setIsLoading(false);
          return;
        }
        response = await usersApi.update(editUser.id, changedFields);
      } else {
        const createData: UserCreate & { status?: 'active' | 'inactive' } = {
          ...formData,
          password: currentUser?.role === 'superadmin' ? formData.password : 'kisaan@123',
          email: currentUser?.role === 'superadmin' ? formData.email : 'contact@kisaancenter.com',
          balance: formData.balance || 0,
          shop_id: currentUser?.shop_id
        };
        if (currentUser?.role !== 'superadmin') {
          delete createData.status;
        }
        if (!createData.username || createData.username.trim() === '') {
          delete createData.username;
        }
        if (!createData.contact) {
          createData.contact = '';
        }
        response = await usersApi.create(createData);
      }
      if (response.success && response.data) {
        const userDetails = response.data;
        const successMessage = editUser 
          ? `User "${userDetails.firstname && userDetails.firstname.trim() ? userDetails.firstname : userDetails.username}" updated successfully`
          : `User "${userDetails.firstname && userDetails.firstname.trim() ? userDetails.firstname : userDetails.username}" created successfully`;
        toastService.success(successMessage, {
          title: editUser ? 'User Updated' : 'User Created',
          description: `Role: ${userDetails.role}${userDetails.shop_id ? ` | Shop ID: ${userDetails.shop_id}` : ''}`
        });
        if (!editUser && userDetails.role === 'owner' && !userDetails.shop_id) {
          setTimeout(() => {
            toastService.info('Remember to create a shop for this owner to manage products and transactions.', {
              title: 'Next Step',
              duration: 6000
            });
          }, 2000);
        }
        onSuccess?.(response.data);
      } else {
        setFormError('User operation completed but response was unexpected. Please refresh the page.');
        toastService.warning('User operation may have completed but response was unexpected. Please refresh the page.');
      }
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      let errorMessage = 'Failed to save user. Please check your input.';
      if (typeof error === 'object' && error !== null) {
        if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
          const data = (error.response as { data?: { message?: string } }).data;
          errorMessage = (data && data.message) || errorMessage;
        } else if ('message' in error) {
          errorMessage = (error as { message?: string }).message || errorMessage;
        }
      }
      setFormError(errorMessage);
      toastService.error(errorMessage, {
        title: editUser ? 'Update Failed' : 'Creation Failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {editUser ? 'Edit User' : 'Create New User'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name (for auto-generating username) */}
          <div className="space-y-2">
            <Label htmlFor="firstname">First Name *</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const firstname = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  firstname
                }));
              }}
              placeholder="Enter first name"
              required
            />
            <div className="text-xs text-gray-500">Enter the user's first name. Username will be auto-generated.</div>
          </div>

          {formError && (
            <div className="text-red-600 text-sm font-medium mb-2">{formError}</div>
          )}
          {/* Role Selection - Based on current user role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            {editUser ? (
              <Input
                id="role"
                value={formData.role === 'owner' ? 'Owner' : formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                disabled
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
            ) : (
              <Select 
                value={formData.role} 
                onValueChange={(value: 'superadmin' | 'owner' | 'farmer' | 'buyer') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
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
            )}
          </div>

          {/* Username - Only for superadmin */}
          {currentUser?.role === 'superadmin' && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, username: e.target.value }));
                }}
                placeholder="Leave empty for auto-generation"
              />
              <div className="text-xs text-gray-500">Leave empty to auto-generate from first name</div>
            </div>
          )}

          {/* Email - Enhanced for superadmin */}
          <div className="space-y-2">
            <Label htmlFor="email">Email {currentUser?.role === 'superadmin' ? '*' : ''}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
              }}
              placeholder="Enter email address"
              required={currentUser?.role === 'superadmin'}
            />
            {currentUser?.role !== 'superadmin' && (
              <div className="text-xs text-gray-500">Default email will be used for farmers/buyers</div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number *</Label>
            <div className="text-xs text-gray-500">Required. Enter a valid 10-digit phone number.</div>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData(prev => ({ ...prev, contact: e.target.value }));
                if (!e.target.value || e.target.value.length < 10) {
                  setContactError('Contact number is required and must be at least 10 digits');
                } else {
                  setContactError(null);
                }
              }}
              placeholder="Enter 10-digit contact number"
              required
            />
            {contactError && <div className="text-xs text-red-600 mt-1">{contactError}</div>}
          </div>

          {/* Password - Optional for superadmin and owner when editing */}
          {(currentUser?.role === 'superadmin' || (currentUser?.role === 'owner' && editUser)) && (
            <div className="space-y-2">
              <Label htmlFor="password">Password {editUser ? '(leave blank to keep unchanged)' : '*'} </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, password: e.target.value }));
                }}
                placeholder={editUser ? "Leave blank to keep current password" : "Enter password"}
                required={currentUser?.role === 'superadmin' && !editUser}
              />
              <div className="text-xs text-gray-500">{editUser ? "Password is optional. Only fill to change." : "Minimum 6 characters recommended"}</div>
            </div>
          )}

          {/* Shop ID - Only for superadmin creating owners */}
          {currentUser?.role === 'superadmin' && formData.role === 'owner' && (
            <div className="space-y-2">
              <Label htmlFor="shop_id">Shop ID</Label>
              <Input
                id="shop_id"
                type="number"
                value={formData.shop_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, shop_id: e.target.value ? Number(e.target.value) : undefined }));
                }}
                placeholder="Enter shop ID (optional)"
              />
              <div className="text-xs text-gray-500">Leave empty if creating shop later</div>
            </div>
          )}

          {/* Initial Balance - Only for superadmin */}
          {currentUser?.role === 'superadmin' && (
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                value={formData.balance || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ ...prev, balance: e.target.value ? Number(e.target.value) : 0 }));
                }}
                placeholder="Enter initial balance"
              />
              <div className="text-xs text-gray-500">Default is 0.00</div>
            </div>
          )}

          {/* Commission Rate - For farmers and buyers */}
          {(formData.role === 'farmer' || formData.role === 'buyer') && (
            <div className="space-y-2">
              <Label htmlFor="custom_commission_rate">Commission Rate (%)</Label>
              <Input
                id="custom_commission_rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.custom_commission_rate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    custom_commission_rate: e.target.value ? Number(e.target.value) : undefined 
                  }));
                }}
                placeholder="e.g., 10"
              />
              <div className="text-xs text-gray-500">
                Leave empty to use shop default (10%). Personal commission rate overrides shop rate.
              </div>
            </div>
          )}

          {/* Status - Only for superadmin */}
          {currentUser?.role === 'superadmin' && (
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status || 'active'} 
                onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editUser ? 'Update User' : 'Create User'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};