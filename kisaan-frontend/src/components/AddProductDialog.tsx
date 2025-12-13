import React, { useState, useEffect, useRef } from 'react';
import { useCategoriesCache } from '../hooks/useCategoriesCache';
import { apiClient } from '../services/apiClient';
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
import { MoneyInput } from './ui/MoneyInput';
import { FormField } from './ui/FormField';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFormState } from '@/hooks/useFormState';
import { useToast } from '@/hooks/use-toast';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shopId?: number;
}



export default function AddProductDialog({ open, onOpenChange, onSuccess, shopId }: AddProductDialogProps) {
  const { values: formData, handleChange, setField, reset } = useFormState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    unit: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  type Category = { id: number; name: string; };

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 30);
    }
  }, [open]);

  const { getCategories, setCategoriesCache } = useCategoriesCache();

  useEffect(() => {
    if (open) {
      const cached = getCategories();
      if (cached) {
        setCategories(cached);
      } else {
        fetchCategories();
      }
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      // Assume response is { data: Category[] } or Category[]
      let categoriesData: Category[] = [];
      if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && Array.isArray((response as { data?: unknown }).data)) {
        categoriesData = (response as { data: Category[] }).data;
      }
      setCategoriesCache(categoriesData);
      setCategories(categoriesData);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const productData: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        category_id: parseInt(formData.category_id),
        unit: formData.unit || null
      };
      if (formData.price && !isNaN(Number(formData.price))) {
        productData.price = parseFloat(formData.price);
      }

      // Create the product first
      const productResponse = await apiClient.post('/products', productData);
      // createdProduct can be { id: number } or similar
      const createdProduct = (productResponse as { data?: { id?: number } }).data || productResponse;
      if (createdProduct && typeof createdProduct === 'object' && 'id' in createdProduct && shopId) {
        try {
          await apiClient.post(`/shops/${shopId}/products/${(createdProduct as { id: number }).id}`);
        } catch (assignError) {
          console.warn('Product created but failed to assign to shop:', assignError);
          // Still continue - product was created successfully
        }
      }
      
      toast({
        title: 'Success',
        description: 'Product created successfully',
        variant: 'success',
      });
      
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setField(field as FieldName, value);
  };
  type FieldName = 'name' | 'description' | 'category_id' | 'price' | 'unit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your shop's category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <FormField id="name" label="Product Name" required>
            <Input
              id="name"
              ref={firstFieldRef}
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Enter product name"
              required
            />
          </FormField>

          <FormField id="category_id" label="Category" required>
            <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="price" label="Price">
              <MoneyInput
                id="price"
                value={formData.price}
                onRawChange={(raw) => setField('price', raw)}
                onValueChange={(num) => setField('price', num.toFixed(2))}
                minValue={0}
                placeholder="0.00"
              />
            </FormField>
            <FormField id="unit" label="Unit">
              <Input
                id="unit"
                value={formData.unit}
                onChange={handleChange('unit')}
                placeholder="kg, piece, etc."
              />
            </FormField>
          </div>

          <FormField id="description" label="Description">
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Product description (optional)"
              rows={3}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}