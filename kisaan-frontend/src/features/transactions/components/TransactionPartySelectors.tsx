import React from 'react';
import { Badge } from '@/components/ui/badge';
import Select from 'react-select';
import type { SingleValue } from 'react-select';
import { Label } from '@/components/ui/label';
import type { User, Category } from '@/types/api';

interface Product { id: number; name: string; category_id: number }

interface Props {
  farmers: User[];
  buyers: User[];
  categories: Category[];
  products: Product[];
  values: {
    farmer_id: number;
    buyer_id: number;
    category_id: number;
    product_id?: number;
    product_name: string;
  };
  errors: Record<string, string>;
  onChange: (patch: Partial<Props['values']>) => void;
}

export const TransactionPartySelectors: React.FC<Props> = ({ farmers, buyers, categories, products, values, errors, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
      <div className="mb-2">
        <Label>Farmer * <Badge userType="FARMER" className="ml-1 align-middle" /></Label>
        <Select
          options={farmers.map(f => ({ value: f.id, label: `${f.firstname || f.username} (${f.id})` }))}
          value={values.farmer_id ? { value: values.farmer_id, label: `${farmers.find(f => f.id === values.farmer_id)?.firstname || farmers.find(f => f.id === values.farmer_id)?.username} (${values.farmer_id})` } : null}
          onChange={(opt: SingleValue<{ value: number; label: string }>) => onChange({ farmer_id: opt ? opt.value : 0 })}
          isClearable
          placeholder="Search and select farmer"
          classNamePrefix="react-select"
        />
        {errors.farmer_id && <p className="text-sm text-red-500">{errors.farmer_id}</p>}
      </div>
      <div className="mb-2">
        <Label>Buyer * <Badge userType="BUYER" className="ml-1 align-middle" /></Label>
        <Select
          options={buyers.map(b => ({ value: b.id, label: `${b.firstname || b.username} (${b.id})` }))}
          value={values.buyer_id ? { value: values.buyer_id, label: `${buyers.find(b => b.id === values.buyer_id)?.firstname || buyers.find(b => b.id === values.buyer_id)?.username} (${values.buyer_id})` } : null}
          onChange={(opt: SingleValue<{ value: number; label: string }>) => onChange({ buyer_id: opt ? opt.value : 0 })}
          isClearable
          placeholder="Search and select buyer"
          classNamePrefix="react-select"
        />
        {errors.buyer_id && <p className="text-sm text-red-500">{errors.buyer_id}</p>}
      </div>
      <div className="space-y-2">
        <Label>Category * <span className="text-xs text-gray-500">(Shop category)</span></Label>
        <select
          value={values.category_id}
          onChange={e => onChange({ category_id: parseInt(e.target.value) })}
          className={`block w-full border rounded p-2 text-sm ${errors.category_id ? 'border-red-500' : ''}`}
        >
          <option value="" disabled>Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}
      </div>
      <div className="space-y-2">
        <Label>Product *</Label>
        <Select
          options={products.map(p => ({ value: p.id, label: `${p.name} (${p.id})` }))}
          value={values.product_id ? { value: values.product_id, label: `${values.product_name} (${values.product_id})` } : null}
          onChange={(opt: SingleValue<{ value: number; label: string }>) => opt ? onChange({ product_id: opt.value, product_name: opt.label.split(' (')[0] }) : onChange({ product_id: undefined, product_name: '' })}
          isClearable
          placeholder="Search and select product"
          classNamePrefix="react-select"
        />
        {errors.product_name && <p className="text-sm text-red-500">{errors.product_name}</p>}
      </div>
    </div>
  );
};
