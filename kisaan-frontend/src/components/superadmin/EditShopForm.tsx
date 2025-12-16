import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Loader2 } from 'lucide-react';
import { shopsApi, categoriesApi } from '../../services/api';
import type { Shop, Category } from '../../types/api';

interface EditShopFormProps {
  shop: Shop;
  onSuccess?: (shop: Shop) => void;
  onCancel?: () => void;
}

export const EditShopForm: React.FC<EditShopFormProps> = ({ shop, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({ ...shop });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

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
    setIsLoading(true);
    try {
      const response = await shopsApi.update(formData.id, formData);
      if (response.success && response.data) {
        onSuccess?.(response.data);
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      alert('Failed to update shop');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Shop</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Shop Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category_id ? formData.category_id.toString() : ''}
              onValueChange={value => setFormData(prev => ({ ...prev, category_id: parseInt(value) }))}
              disabled={isLoadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingCategories ? 'Loading categories...' : 'Select category'} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <div className="px-3 py-2 text-gray-500 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading categories...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="px-3 py-2 text-amber-600 text-sm">No categories available</div>
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
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
