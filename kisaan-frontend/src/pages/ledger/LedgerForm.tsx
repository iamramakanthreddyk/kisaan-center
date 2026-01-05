import React, { useState } from 'react';
import type { User } from '../../types';
import { UserSearchDropdown } from '../../components/ui/UserSearchDropdown';
import { Button } from '../../components/ui/button';
import { AlertCircle } from 'lucide-react';
import { createBatchLedgerEntries } from './api';
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
  const [accumulatedEntries, setAccumulatedEntries] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const handleEditQueuedEntry = (index: number) => {
    const entry = accumulatedEntries[index];
    setFormData({
      type: entry.type,
      category: entry.category,
      amount: entry.amount.toString(),
      notes: entry.notes || '',
      entryDate: entry.entry_date
    });
    setEditingIndex(index);
    setError(null);
  };

  const handleSaveEditedEntry = () => {
    if (editingIndex === null) return;

    const updatedEntry = {
      shop_id: Number(selectedFarmer?.shop_id),
      farmer_id: Number(selectedFarmer?.id),
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      notes: formData.notes,
      created_by: user?.id,
      entry_date: formData.entryDate
    };

    const updatedEntries = [...accumulatedEntries];
    updatedEntries[editingIndex] = updatedEntry;
    setAccumulatedEntries(updatedEntries);

    // Reset form and editing state
    setFormData({
      type: 'credit',
      category: 'sale',
      amount: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
    setEditingIndex(null);
    toastService.success('Queued entry updated');
  };

  const handleCancelEdit = () => {
    setFormData({
      type: 'credit',
      category: 'sale',
      amount: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
    setEditingIndex(null);
    setError(null);
    toastService.info('Edit cancelled');
  };

  const handleDiscardCurrent = () => {
    setFormData({
      type: 'credit',
      category: 'sale',
      amount: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
    setError(null);
    toastService.info('Current entry discarded');
  };

  const handleCancelBatch = () => {
    setAccumulatedEntries([]);
    setFormData({
      type: 'credit',
      category: 'sale',
      amount: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
    setSelectedFarmer(null);
    setError(null);
    toastService.info('Batch cancelled. Start fresh with a new farmer.');
  };

  const handleAddMore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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

    // Add current entry to accumulated entries
    const newEntry = {
      shop_id: Number(selectedFarmer.shop_id),
      farmer_id: Number(selectedFarmer.id),
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      notes: formData.notes,
      created_by: user?.id,
      entry_date: formData.entryDate
    };

    setAccumulatedEntries([...accumulatedEntries, newEntry]);

    // Reset form for next entry (keep farmer selected for batch mode)
    setFormData({
      type: 'credit',
      category: 'sale',
      amount: '',
      notes: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
    // Note: selectedFarmer stays selected for batch mode
    toastService.success('Entry added to queue. Add more or click Save All to submit.');
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate current form
    if (!selectedFarmer) {
      setError('Please select a farmer for the current entry');
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

    // Add current entry to accumulated entries only if it has valid data
    let entriesToSubmit = [...accumulatedEntries];
    if (formData.amount && parseFloat(formData.amount) > 0) {
      const finalEntry = {
        shop_id: Number(selectedFarmer.shop_id),
        farmer_id: Number(selectedFarmer.id),
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        created_by: user?.id,
        entry_date: formData.entryDate
      };
      entriesToSubmit = [...accumulatedEntries, finalEntry];
    }

    if (entriesToSubmit.length === 0) {
      setError('Please add at least one entry');
      return;
    }

    setLoading(true);
    try {
      // Submit batch entries
      await createBatchLedgerEntries(entriesToSubmit);

      toastService.success(`Successfully created ${entriesToSubmit.length} ledger entries`, {
        title: 'Batch Submission Complete',
        description: `${entriesToSubmit.length} entries have been added to the ledger`,
        duration: 4000
      });

      // Reset form and accumulated entries
      setAccumulatedEntries([]);
      setFormData({
        type: 'credit',
        category: 'sale',
        amount: '',
        notes: '',
        entryDate: new Date().toISOString().split('T')[0]
      });
      setSelectedFarmer(null);

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toastService.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">
          {accumulatedEntries.length === 0 ? 'Select Farmer' : 'Farmer'} <span className="text-red-500">*</span>
        </label>
        {accumulatedEntries.length === 0 ? (
          <div className="w-full min-w-0">
            <UserSearchDropdown
              onSelect={setSelectedFarmer}
              roleFilter="farmer"
              placeholder="Search farmer by name or contact"
            />
          </div>
        ) : (
          <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
            {selectedFarmer?.username || 'Farmer'} (ID: {selectedFarmer?.id})
            <div className="text-xs text-gray-600 mt-1">Farmer is locked during batch entry</div>
          </div>
        )}
        {selectedFarmer && accumulatedEntries.length === 0 && (
          <div className="mt-1 text-green-700 text-xs">
            Selected: {selectedFarmer.username} (ID: {selectedFarmer.id})
          </div>
        )}
      </div>

      <div className="space-y-3">
        {accumulatedEntries.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-semibold text-blue-900 mb-2">Queued Entries ({accumulatedEntries.length})</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accumulatedEntries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="text-sm">
                    <span className="font-medium capitalize">{entry.type}</span> • 
                    <span className="capitalize">{entry.category}</span> • 
                    ₹{entry.amount} • 
                    {new Date(entry.entry_date).toLocaleDateString()}
                    {entry.notes && <span className="text-gray-500 ml-1">• {entry.notes}</span>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditQueuedEntry(index)}
                    disabled={loading}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
            {editingIndex !== null && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                Editing entry #{editingIndex + 1}. Make changes and click "Update Entry".
              </div>
            )}
          </div>
        )}
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
        <label className="block text-sm font-semibold mb-2">Amount <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">(₹)</span></label>
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
        {editingIndex !== null ? (
          <>
            <Button type="button" onClick={handleSaveEditedEntry} disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0} className="w-full py-3">
              {loading ? 'Updating...' : 'Update Entry'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading} className="w-full py-3">
              Cancel Edit
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={handleAddMore} disabled={loading || !selectedFarmer || !formData.amount || parseFloat(formData.amount) <= 0} className="w-full py-3">
              {loading ? 'Processing...' : 'Add More'}
            </Button>
            {accumulatedEntries.length > 0 && (
              <>
                <Button type="button" variant="outline" onClick={handleDiscardCurrent} disabled={loading} className="w-full py-3 border-red-300 text-red-600 hover:bg-red-50">
                  Discard & Save Queued Only
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelBatch} disabled={loading} className="w-full py-3 border-orange-300 text-orange-600 hover:bg-orange-50">
                  Cancel Batch & Start Over
                </Button>
              </>
            )}
          </>
        )}
        {!editingIndex && (
          <Button type="submit" disabled={loading || !selectedFarmer || (accumulatedEntries.length === 0 && (!formData.amount || parseFloat(formData.amount) <= 0))} className="w-full py-3">
            {loading ? 'Saving...' : accumulatedEntries.length > 0 ?
              (!formData.amount || parseFloat(formData.amount) <= 0) ?
                `Save Queued Entries (${accumulatedEntries.length})` :
                `Save All (${accumulatedEntries.length + 1})`
              : 'Save Entry'}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-full py-3">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default LedgerForm;
