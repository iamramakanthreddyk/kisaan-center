import { getUserDisplayName } from '../utils/userDisplayName';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SimpleFarmerLedgerDashboard } from '../components/SimpleFarmerLedgerDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect owners and superadmins to their dedicated dashboards immediately
  useEffect(() => {
    if (user?.role === 'owner') {
      navigate('/simple-ledger', { replace: true });
      return;
    }
    if (user?.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="w-full max-w-xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Please log in to access the dashboard.
        </div>
      </div>
    );
  }

  // For farmer role, show SimpleFarmerLedgerDashboard
  if (user.role === 'farmer') {
    return <SimpleFarmerLedgerDashboard />;
  }
  // For other non-owner roles, show simple message
  return (
    <div className="w-full max-w-xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Dashboard</h1>
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {getUserDisplayName(user)} ({user.role})
        </h1>
        <div className="text-sm opacity-90 mt-4">
          Dashboard for {user.role} role is under development.
        </div>
      </div>
    </div>
  );
}