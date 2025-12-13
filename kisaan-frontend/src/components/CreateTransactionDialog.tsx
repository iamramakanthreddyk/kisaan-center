import React, { useState, useEffect, useRef } from 'react';
// Define Product type for type safety
interface Product {
  id: number;
  name: string;
  category_id: number;
  unit?: string;
}
import { apiClient } from '../services/apiClient';
import { useTransactionFormData } from '@/hooks/useTransactionFormData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MoneyInput } from './ui/MoneyInput';
import { FormField } from './ui/FormField';
import { useFormState } from '@/hooks/useFormState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useOwnerDashboard } from '@/hooks/useOwnerDashboard';
import { useToast } from '@/hooks/use-toast';

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shopId?: number;
}

export default function CreateTransactionDialog({ open, onOpenChange, onSuccess, shopId }: CreateTransactionDialogProps) {
  const { farmers, buyers, products, categories, isLoading: dataLoading, error: dataError, refetch } = useTransactionFormData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const { values: formData, setField, handleChange, reset } = useFormState({
    farmer_id: '',
    buyer_id: '',
    category_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    commission_rate: '12'
  });
  const { addTransactionOptimistic, refreshData } = useOwnerDashboard();
  const { toast } = useToast();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (open && (farmers.length === 0 || buyers.length === 0 || categories.length === 0)) {
      refetch();
    }
  }, [open, farmers.length, buyers.length, categories.length, refetch]);

  // Filter products by selected category
  useEffect(() => {
    if (formData.category_id) {
  const categoryId = parseInt(formData.category_id);
  const filtered = (products as Product[]).filter((product) => product.category_id === categoryId);
      setFilteredProducts(filtered);
      // Reset product selection if current product doesn't belong to selected category
      if (formData.product_id) {
  const currentProduct = (products as Product[]).find((p) => p.id === parseInt(formData.product_id));
        if (!currentProduct || currentProduct.category_id !== categoryId) {
          setField('product_id', '');
        }
      }
    } else {
      // Only include products that have category_id (type guard)
      setFilteredProducts((products as Product[]).filter((p): p is Product => typeof p.category_id === 'number'));
    }
  }, [formData.category_id, products, formData.product_id, setField]);

  useEffect(() => {
    if (dataError) {
      toast({
        title: 'Error',
        description: dataError,
        variant: 'destructive',
      });
    }
  }, [dataError, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    setIsSubmitting(true);

    try {
  const selectedProduct = (products as Product[]).find((p) => p.id === parseInt(formData.product_id));
      const payload = {
        shop_id: shopId,
        farmer_id: parseInt(formData.farmer_id),
        buyer_id: parseInt(formData.buyer_id),
        category_id: parseInt(formData.category_id),
        product_name: selectedProduct?.name || 'Custom Product',
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        commission_rate: parseFloat(formData.commission_rate)
      };

      // Optimistic update: assume commission rate if derivable
      let rollback: (() => void) | undefined;
      try {
        rollback = addTransactionOptimistic({
          quantity: payload.quantity,
          price: payload.unit_price,
          commissionRate: payload.commission_rate
        });
      } catch { /* no-op */ }

      try {
        await apiClient.post('/transactions', payload);
      } catch (postErr) {
        rollback?.();
        throw postErr;
      }
      // Re-sync to get authoritative backend values (commission etc.)
      refreshData();
      
      toast({
        title: 'Success',
        description: 'Transaction created successfully',
      });
      
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create transaction',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // derived values
  const calculatedTotal = parseFloat(formData.quantity || '0') * parseFloat(formData.unit_price || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record New Sale</DialogTitle>
        </DialogHeader>



        {dataLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading form data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="farmer_id" label="Farmer">
            <Select value={formData.farmer_id} onValueChange={(value) => setField('farmer_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id.toString()}>{farmer.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="buyer_id" label="Buyer">
            <Select value={formData.buyer_id} onValueChange={(value) => setField('buyer_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select buyer" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id.toString()}>{buyer.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="category_id" label="Category" required>
            <Select value={formData.category_id} onValueChange={(value) => {
              setField('category_id', value);
              setField('product_id', '');
            }}>
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

          <FormField id="product_id" label="Product" required>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => setField('product_id', value)}
              disabled={!formData.category_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.category_id ? "Select product" : "Select category first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} {product.unit && `(${product.unit})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="quantity" label="Quantity" required>
              <Input
                id="quantity"
                ref={firstFieldRef}
                type="number"
                value={formData.quantity}
                onChange={handleChange('quantity')}
                required
              />
            </FormField>
            <FormField id="price" label="Price per unit" required>
              <MoneyInput
                id="price"
                value={formData.unit_price}
                onRawChange={(raw) => setField('unit_price', raw)}
                onValueChange={(num) => setField('unit_price', num.toFixed(2))}
                minValue={0}
                placeholder="0.00"
                required
              />
            </FormField>
          </div>

          {calculatedTotal > 0 && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">Total: ₹{calculatedTotal.toFixed(2)}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField id="commission_rate" label="Commission Rate (%)" required>
              <Input
                id="commission_rate"
                value={formData.commission_rate}
                onChange={(e) => setField('commission_rate', e.target.value)}
                placeholder="Commission percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
              />
            </FormField>
            <FormField id="calculated_total" label="Total Amount">
              <Input
                id="calculated_total"
                value={`₹${calculatedTotal.toFixed(2)}`}
                disabled
                className="bg-gray-50"
              />
            </FormField>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || dataLoading}>
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}