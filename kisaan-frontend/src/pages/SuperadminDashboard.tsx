import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Building2, Users, Settings, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSuperadminDashboard } from '../hooks/useSuperadminDashboard';
import { useUserActivityStats } from '../hooks/useUserActivityStats';
import { SuperadminStats } from '../components/superadmin/SuperadminStats';

const SuperadminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, recentShops, isLoading, error, refreshData } = useSuperadminDashboard();
  const { activityStats, isLoading: activityLoading, error: activityError, refreshData: refreshActivity } = useUserActivityStats();

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

      {/* User Activity Monitoring */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            User Activity Monitoring
          </h2>
          <Button 
            onClick={refreshActivity} 
            variant="outline" 
            size="sm"
            disabled={activityLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${activityLoading ? 'animate-spin' : ''}`} />
            Refresh Activity
          </Button>
        </div>

        {activityError ? (
          <Card>
            <CardContent className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-medium">Error Loading Activity Data</h3>
                <p className="text-red-600 text-sm mt-1">{activityError}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {activityLoading ? '...' : activityStats.activeSessions}
                </div>
                <p className="text-xs text-gray-500 mt-1">Currently active user sessions</p>
              </CardContent>
            </Card>

            {/* Users with Multiple Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Multiple Session Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {activityLoading ? '...' : activityStats.usersWithMultipleSessions.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">Users with multiple active sessions</p>
              </CardContent>
            </Card>

            {/* Recent Logins */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Recent Logins (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {activityLoading ? '...' : activityStats.recentLogins.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">Users who logged in recently</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Logins Table */}
        {!activityError && activityStats.recentLogins.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Recent User Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityStats.recentLogins.slice(0, 10).map((login) => (
                      <tr key={login.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{login.name}</div>
                          <div className="text-sm text-gray-500">{login.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(login.last_login).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {login.login_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {login.last_activity ? new Date(login.last_activity).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users with Multiple Sessions */}
        {!activityError && activityStats.usersWithMultipleSessions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <Shield className="w-4 h-4 mr-2" />
                Users with Multiple Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityStats.usersWithMultipleSessions.map((user) => (
                  <div key={user.user_id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.user.name}</p>
                      <p className="text-sm text-gray-600">{user.user.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.user.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                        {user.session_count} sessions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            onClick={() => navigate('/superadmin/features')} 
            variant="outline" 
            className="h-20 flex-col space-y-2"
          >
            <Shield className="h-6 w-6" />
            <span className="text-sm font-medium">Feature Control</span>
          </Button>
          <Button 
            onClick={() => navigate('/superadmin/categories')} 
            variant="outline" 
            className="h-20 flex-col space-y-2"
          >
            <Settings className="h-6 w-6" />
            <span className="text-sm font-medium">Categories</span>
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