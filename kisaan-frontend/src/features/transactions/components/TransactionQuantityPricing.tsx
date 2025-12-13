import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
  quantity: number;
  unit_price: number;
  errors: Record<string, string>;
  onChange: (patch: { quantity?: number; unit_price?: number }) => void;
}

export const TransactionQuantityPricing: React.FC<Props> = ({ quantity, unit_price, errors, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
      <div className="space-y-2">
        <Label>Quantity *</Label>
        <Input
          type="number"
            min="0"
          step="0.01"
          value={quantity === 0 ? '' : quantity}
          onChange={e => onChange({ quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          placeholder="0.00"
          className={errors.quantity ? 'border-red-500' : ''}
        />
        {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
      </div>
      <div className="space-y-2">
        <Label>Unit Price (₹) *</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={unit_price === 0 ? '' : unit_price}
          onChange={e => onChange({ unit_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          placeholder="0.00"
          className={errors.unit_price ? 'border-red-500' : ''}
        />
        {errors.unit_price && <p className="text-sm text-red-500">{errors.unit_price}</p>}
      </div>
    </div>
  );
};
