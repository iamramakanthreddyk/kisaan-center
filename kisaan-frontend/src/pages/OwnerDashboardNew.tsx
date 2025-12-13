import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOwnerDashboard } from '../hooks/useOwnerDashboard';
import { DashboardStats } from '../components/owner/DashboardStats';
import { QuickActions } from '../components/owner/QuickActions';
import { Section } from '@/components/ui/Section';
import { usePrefetchOnFocus } from '@/hooks/usePrefetchOnFocus';

const OwnerDashboardNew: React.FC = () => {

  // const { user } = useAuth();
  const { stats, isLoading, error, refreshData } = useOwnerDashboard();

  // Auto refresh when returning to the tab / window.
  usePrefetchOnFocus(() => {
    if (!isLoading) {
      refreshData();
    }
  });

  const navigate = useNavigate();

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
  <div className="p-2 sm:p-6 space-y-2 sm:space-y-6 bg-blue-50">
      {/* Header - Responsive for mobile */}

      <div className="flex flex-row items-center justify-between mb-2 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 text-base sm:text-lg mt-1">Key metrics for today</p>
        </div>
        <Button
          onClick={refreshData}
          variant="ghost"
          size="icon"
          disabled={isLoading}
          className="ml-2"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Dashboard Stats - Ensure mobile-friendly layout in child */}
      <Section title={undefined} description={undefined} padded>
        <DashboardStats stats={stats} isLoading={isLoading} />
      </Section>

      {/* Quick Actions - Add spacing for mobile */}
      <Section title="Quick Actions" description="Frequent tasks" padded>
        <QuickActions />
      </Section>

      {/* Pending Actions removed for cleaner UI */}
    </div>
  );
};

export default OwnerDashboardNew;