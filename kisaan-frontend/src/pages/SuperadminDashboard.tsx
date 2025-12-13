import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Building2, Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSuperadminDashboard } from '../hooks/useSuperadminDashboard';
import { SuperadminStats } from '../components/superadmin/SuperadminStats';

const SuperadminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, recentShops, isLoading, error, refreshData } = useSuperadminDashboard();

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Superadmin Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.username} • Platform overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      <SuperadminStats stats={stats} isLoading={isLoading} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            onClick={() => navigate('/superadmin/shops')} 
            className="h-20 flex-col space-y-2"
          >
            <Building2 className="h-6 w-6" />
            <span className="text-sm font-medium">Manage Shops</span>
          </Button>
          <Button 
            onClick={() => navigate('/superadmin/users')} 
            variant="outline" 
            className="h-20 flex-col space-y-2"
          >
            <Users className="h-6 w-6" />
            <span className="text-sm font-medium">Manage Users</span>
          </Button>
          <Button 
            onClick={() => navigate('/superadmin/categories')} 
            variant="outline" 
            className="h-20 flex-col space-y-2"
          >
            <Settings className="h-6 w-6" />
            <span className="text-sm font-medium">Categories</span>
          </Button>
          <Button 
            onClick={() => navigate('/superadmin/reports')} 
            variant="outline" 
            className="h-20 flex-col space-y-2"
          >
            <RefreshCw className="h-6 w-6" />
            <span className="text-sm font-medium">Reports</span>
          </Button>
        </div>
      </div>

      {/* Recent Shops */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Shops</span>
            <Button 
              size="sm" 
              onClick={() => navigate('/superadmin/shops')}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentShops.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No shops found</p>
            ) : (
              recentShops.map(shop => (
                <div key={shop.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{shop.name}</p>
                    <p className="text-sm text-gray-600">{shop.address}</p>
                    <p className="text-xs text-gray-500">Contact: {shop.contact}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      shop.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {shop.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminDashboard;