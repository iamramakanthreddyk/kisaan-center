import React, { useState } from 'react';
import type { User } from '../../types';
import { UserSearchDropdown } from '../../components/ui/UserSearchDropdown';
import { Button } from '../../components/ui/button';
import { AlertCircle } from 'lucide-react';
import { createLedgerEntry } from './api';
import { toastService } from '../../services/toastService';
import { useAuth } from '../../context/AuthContext';

interface LedgerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LedgerForm: React.FC<LedgerFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'credit', // Default to credit
    category: 'sale', // Default category for credit
    amount: '',
    notes: '',
    entryDate: new Date().toISOString().split('T')[0] // Default to today
  });
  const { user } = useAuth();
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ledgerTypes = ['credit', 'debit'];

  // Dynamic categories based on type
  const getCategoriesForType = (type: string) => {
    if (type === 'credit') {
      return ['sale', 'deposit', 'other'];
    } else {
      return ['expense', 'withdrawal', 'loan', 'other'];
    }
  };

  const ledgerCategories = getCategoriesForType(formData.type);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // If type changes, reset category to first valid option for new type
      if (name === 'type') {
        const newCategories = getCategoriesForType(value);
        if (!newCategories.includes(prev.category)) {
          newData.category = newCategories[0];
        }
      }

      return newData;
    });
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
        created_by: user?.id,
        entry_date: formData.entryDate
      });
      toastService.success(
        `Ledger entry added for ${selectedFarmer.username} (ID: ${selectedFarmer.id})`,
        {
          title: 'Ledger Entry Added',
          description: `Type: ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}, Category: ${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}, Amount: ₹${formData.amount}`,
          duration: 4000
        }
      );
      setFormData({ type: 'credit', category: 'sale', amount: '', notes: '', entryDate: new Date().toISOString().split('T')[0] });
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

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold mb-2">Type</label>
          <div className="flex gap-2">
            {ledgerTypes.map(t => (
              <button
                key={t}
                type="button"
                name="type"
                onClick={() => handleChange({ target: { name: 'type', value: t } } as any)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center ${formData.type === t ? 'bg-primary text-white' : 'bg-white border border-gray-200'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {ledgerCategories.map(c => (
              <button
                key={c}
                type="button"
                name="category"
                onClick={() => handleChange({ target: { name: 'category', value: c } } as any)}
                className={`px-3 py-2 rounded-full text-sm font-medium ${formData.category === c ? 'bg-primary text-white' : 'bg-white border border-gray-200'}`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Entry Date <span className="text-red-500">*</span></label>
        <input
          type="date"
          name="entryDate"
          value={formData.entryDate}
          onChange={handleChange}
          max={new Date().toISOString().split('T')[0]} // Prevent future dates
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Select the date when this transaction occurred</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Amount <span className="text-gray-400 text-xs">(₹)</span></label>
        <input
          type="number"
          inputMode="decimal"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
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

      <div className="flex flex-col gap-2 pt-4">
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Adding...' : 'Add Entry'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full py-3">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default LedgerForm;
