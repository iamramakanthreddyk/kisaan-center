import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { TransactionForm } from '../components/owner/TransactionForm';

export default function NewTransactionPage() {
  const navigate = useNavigate();

  // Clear form and route to transactions page after completion
  const handleSuccess = () => {
    navigate('/transactions');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/transactions')}>
            Back
          </Button>
          <h1 className="text-3xl font-bold">Record New Sale</h1>
        </div>
        <TransactionForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}