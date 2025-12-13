import React, { useState, useEffect, useRef } from 'react';
import { shopProductsApi } from '../services/api';
import type { Shop } from '../types/api';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FormField } from './ui/FormField';
import { useFormState } from '@/hooks/useFormState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const { user } = useAuth();
  const { values: formData, handleChange, reset, setField } = useFormState({
    username: '',
    password: '',
    role: '',
    contact: '',
    email: '',
    commission_rate: '',
    shop_id: ''
  });
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
    // Load shops for superadmin
    useEffect(() => {
      if ((!user?.shop_id || user.role === 'superadmin') && open) {
        setShopsLoading(true);
        shopProductsApi.getShops(user)
          .then(setShops)
          .finally(() => setShopsLoading(false));
      }
    }, [user, open]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // slight delay to ensure dialog content mounted
      setTimeout(() => firstFieldRef.current?.focus(), 30);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.role) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Determine shop_id: owner's shop, or selected shop for superadmin
      let shop_id = user?.shop_id;
      if (!shop_id && (formData.role === 'farmer' || formData.role === 'buyer')) {
        shop_id = formData.shop_id ? Number(formData.shop_id) : undefined;
      }
      if ((formData.role === 'farmer' || formData.role === 'buyer') && !shop_id) {
        toast({
          title: 'Validation Error',
          description: 'Please select a shop for the user',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      const userData = {
        ...formData,
        shop_id,
        created_by: user?.id,
        status: 'active',
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : 10
      };
      await apiClient.post('/users', userData);
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      let message = 'Failed to create user';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
        message = (err as { message: string }).message;
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setField(field, value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new farmer or buyer account for your shop.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <FormField id="username" label="Username" required>
            <Input
              id="username"
              ref={firstFieldRef}
              value={formData.username}
              onChange={handleChange('username')}
              placeholder="Enter username"
              required
            />
          </FormField>

          <FormField id="password" label="Password" required>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="Enter password"
              required
            />
          </FormField>

          <FormField id="role" label="Role" required>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer">Farmer</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* Shop selection for superadmin or users without shop_id */}
          {(formData.role === 'farmer' || formData.role === 'buyer') && !user?.shop_id && (
            <FormField id="shop_id" label="Shop" required>
              <Select
                value={formData.shop_id}
                onValueChange={val => setField('shop_id', val)}
                disabled={shopsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={shopsLoading ? 'Loading shops...' : 'Select shop'} />
                </SelectTrigger>
                <SelectContent>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={String(shop.id)}>
                      {shop.name} (ID: {shop.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

            <FormField id="contact" label="Contact">
              <Input
                id="contact"
                value={formData.contact}
                onChange={handleChange('contact')}
                placeholder="Phone number"
              />
            </FormField>

            <FormField id="email" label="Email">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="Email address"
              />
            </FormField>

            {/* Commission Rate - Only for farmers and buyers */}
            {(formData.role === 'farmer' || formData.role === 'buyer') && (
              <FormField id="commission_rate" label="Commission Rate (%)">
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commission_rate}
                  onChange={handleChange('commission_rate')}
                  placeholder="e.g., 10"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Leave empty to use shop default (10%). Personal rate overrides shop rate.
                </div>
              </FormField>
            )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}