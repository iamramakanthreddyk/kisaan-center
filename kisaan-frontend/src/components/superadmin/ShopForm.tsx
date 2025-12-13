import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Loader2, Building2, UserPlus } from 'lucide-react';
import { shopsApi, categoriesApi } from '../../services/api';
import type { User, Shop, Category } from '../../types/api';

interface ShopFormProps {
  onSuccess?: (shop: Shop) => void;
  onCancel?: () => void;
}

export const ShopForm: React.FC<ShopFormProps> = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOwners, setIsLoadingOwners] = useState(true);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [owners, setOwners] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    owner_id: 0,
    address: '',
    contact: '',
    status: 'active' as const,
    category_id: 0
  });

  useEffect(() => {
    loadOwners();
    loadCategories();
  }, []);

  const loadOwners = async () => {
    setIsLoadingOwners(true);
    setOwnersError(null);
    try {
      const ownersList = await shopsApi.getAvailableOwners();
      setOwners(ownersList);
      console.log('Loaded owners:', ownersList); // Debug log
    } catch (error) {
      console.error('Error loading owners:', error);
      let message = 'Failed to load owners';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message?: string }).message || message;
      }
      setOwnersError(message);
    } finally {
      setIsLoadingOwners(false);
    }
  };

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.owner_id || !formData.category_id) {
      alert('Please fill all required fields');
      return;
    }
    
    if (owners.length === 0) {
      alert('No available owners found. Please create users with \'owner\' role first, then return here to create shops for them.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await shopsApi.create(formData);
      if (response.success && response.data) {
        onSuccess?.(response.data);
      }
    } catch (error) {
      console.error('Error creating shop:', error);
      let message = 'Failed to create shop';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message?: string }).message || message;
      }
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Create New Shop
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Shop Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter shop name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner *</Label>
            <Select 
              value={formData.owner_id ? formData.owner_id.toString() : ""} 
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, owner_id: parseInt(value) }))}
              disabled={isLoadingOwners}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingOwners ? "Loading owners..." : 
                  ownersError ? "Error loading owners" : 
                  "Select owner"
                } />
              </SelectTrigger>
              <SelectContent>
                {isLoadingOwners ? (
                  <div className="px-3 py-2 text-gray-500 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading available owners...
                  </div>
                ) : ownersError ? (
                  <div className="px-3 py-2 text-red-500 text-sm">
                    Error: {ownersError}
                    <button 
                      onClick={loadOwners}
                      className="block mt-1 text-xs underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : owners.length === 0 ? (
                  <div className="px-3 py-2">
                    <div className="text-amber-600 text-sm font-medium mb-2">No owners available</div>
                    <div className="text-xs text-gray-600 mb-3">
                      Create users with 'owner' role first, then return here to create shops for them.
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate('/superadmin/users')}
                      className="text-xs h-7"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Create Owner
                    </Button>
                  </div>
                ) : (
                  owners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.username} {owner.email && `(${owner.email})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {ownersError && (
              <div className="text-xs text-red-600 mt-1">
                Failed to load owners. Please try refreshing the page or create an owner first.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category_id ? formData.category_id.toString() : ""} 
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, category_id: parseInt(value) }))}
              disabled={isLoadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingCategories ? "Loading categories..." : "Select category"
                } />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <div className="px-3 py-2 text-gray-500 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading categories...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="px-3 py-2 text-amber-600 text-sm">
                    No categories available
                  </div>
                ) : (
                  categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter shop address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
              placeholder="Enter contact number"
              pattern="[0-9]{10,15}"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Shop
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