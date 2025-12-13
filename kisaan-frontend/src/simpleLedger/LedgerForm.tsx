import React, { useState } from 'react';
import type { User } from '../types/api';
import { UserSearchDropdown } from '../components/ui/UserSearchDropdown';
import { Button } from '../components/ui/button';
import { AlertCircle } from 'lucide-react';
import { createLedgerEntry } from './api';
import { useAuth } from '../context/AuthContext';

interface LedgerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LedgerForm: React.FC<LedgerFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'debit',
    category: 'sale',
    amount: '',
    notes: ''
  });
  const { user } = useAuth();
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ledgerTypes = ['credit', 'debit'];
  const ledgerCategories = ['sale', 'expense', 'withdrawal', 'other'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    if (!selectedFarmer) {
      setError('Please select a farmer');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (selectedFarmer.shop_id === undefined || selectedFarmer.shop_id === null) {
      setError('Selected farmer does not have a valid shop_id');
      return;
    }
    if (selectedFarmer.id === undefined || selectedFarmer.id === null) {
      setError('Selected farmer does not have a valid id');
      return;
    }

    setLoading(true);
    try {
      await createLedgerEntry({
        shop_id: Number(selectedFarmer.shop_id),
        farmer_id: Number(selectedFarmer.id),
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        created_by: user?.id
      });
      setFormData({ type: 'debit', category: 'sale', amount: '', notes: '' });
      setSelectedFarmer(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">Select Farmer <span className="text-red-500">*</span></label>
        <UserSearchDropdown
          onSelect={setSelectedFarmer}
          roleFilter="farmer"
          placeholder="Search farmer by name or contact"
        />
        {selectedFarmer && (
          <div className="mt-1 text-green-700 text-xs">Selected: {selectedFarmer.username} (ID: {selectedFarmer.id})</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ledgerTypes.map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ledgerCategories.map(c => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Amount (₹)</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Optional notes about this entry"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button type="submit" disabled={loading} className="w-full sm:flex-1">
          {loading ? 'Adding...' : 'Add Entry'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default LedgerForm;
