import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Search, User, Shield, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UsersContext } from '../context/UsersContextExport';
import { usersApi } from '../services/api';

interface UserFeature {
  code: string;
  name: string;
  category: string;
  default_enabled: boolean;
  override: boolean | null;
}

interface UserFeatures {
  user_id: number;
  features: UserFeature[];
}

const SuperadminFeatures: React.FC = () => {
  const { user } = useAuth();
  const usersContext = React.useContext(UsersContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userFeatures, setUserFeatures] = useState<UserFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get all users from context
  const allUsers = usersContext?.allUsers || [];
  const usersLoading = usersContext?.isLoading || false;

  // Filter users based on search term - normalize name from context data
  const normalizedUsers = allUsers.map((u: any) => ({
    ...u,
    name: u.name || u.firstname || 'Unknown'
  }));
  
  const filteredUsers = normalizedUsers.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchUserFeatures = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      // This would need to be implemented in the API
      // For now, we'll show a placeholder
      setUserFeatures({
        user_id: userId,
        features: [
          { code: 'ledger.print', name: 'Ledger Print', category: 'ledger', default_enabled: false, override: null },
          { code: 'auth.multiple_sessions', name: 'Multiple Sessions', category: 'auth', default_enabled: false, override: null },
          { code: 'ledger.export', name: 'Ledger Export', category: 'ledger', default_enabled: false, override: null },
          { code: 'dashboard.advanced', name: 'Advanced Dashboard', category: 'dashboard', default_enabled: false, override: null }
        ]
      });
    } catch (err) {
      setError('Failed to fetch user features');
      console.error('Failed to fetch user features:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeatureOverride = async (featureCode: string, enabled: boolean) => {
    if (!userFeatures) return;

    setIsUpdating(featureCode);
    try {
      // This would need to be implemented in the API
      // await featureAdminApi.setOverride(userFeatures.user_id, featureCode, enabled);

      // Update local state
      setUserFeatures(prev => prev ? {
        ...prev,
        features: prev.features.map(f =>
          f.code === featureCode ? { ...f, override: enabled } : f
        )
      } : null);
    } catch (err) {
      console.error('Failed to update feature override:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const clearFeatureOverride = async (featureCode: string) => {
    if (!userFeatures) return;

    setIsUpdating(featureCode);
    try {
      // This would need to be implemented in the API
      // await featureAdminApi.clearOverride(userFeatures.user_id, featureCode);

      // Update local state
      setUserFeatures(prev => prev ? {
        ...prev,
        features: prev.features.map(f =>
          f.code === featureCode ? { ...f, override: null } : f
        )
      } : null);
    } catch (err) {
      console.error('Failed to clear feature override:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Management</h1>
          <p className="text-gray-600">
            Manage user feature access and overrides
          </p>
        </div>
      </div>

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Select User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="p-4 text-center text-gray-500">Loading users...</div>
          ) : normalizedUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={usersLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {searchTerm && !usersLoading && normalizedUsers.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No users found</div>
              ) : (
                filteredUsers.slice(0, 10).map((u) => (
                  <div
                    key={u.id}
                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      fetchUserFeatures(u.id);
                      setSearchTerm('');
                    }}
                  >
                    <div className="font-medium">{u.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">{u.email || 'No email'}</div>
                    <Badge variant="outline" className="mt-1 capitalize">{u.role}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Features */}
      {selectedUserId && userFeatures && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Feature Overrides for User #{userFeatures.user_id}
              </span>
              <Button
                onClick={() => fetchUserFeatures(selectedUserId)}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {userFeatures.features.map((feature) => (
                <div key={feature.code} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{feature.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {feature.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Default: {feature.default_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                    {feature.override !== null && (
                      <p className="text-sm text-blue-600 mt-1">
                        Override: {feature.override ? 'Enabled' : 'Disabled'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {feature.override !== null ? (
                      <>
                        <Badge variant={feature.override ? 'default' : 'secondary'}>
                          {feature.override ? 'Override: ON' : 'Override: OFF'}
                        </Badge>
                        <Button
                          onClick={() => clearFeatureOverride(feature.code)}
                          variant="outline"
                          size="sm"
                          disabled={isUpdating === feature.code}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateFeatureOverride(feature.code, true)}
                          variant="outline"
                          size="sm"
                          disabled={isUpdating === feature.code}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Enable
                        </Button>
                        <Button
                          onClick={() => updateFeatureOverride(feature.code, false)}
                          variant="outline"
                          size="sm"
                          disabled={isUpdating === feature.code}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Disable
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
            <p className="text-gray-600">Search for and select a user above to manage their feature access.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperadminFeatures;