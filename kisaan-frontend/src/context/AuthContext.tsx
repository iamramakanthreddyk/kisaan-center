import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/api';
import { authApi } from '../services/api';

import { useTransactionStore } from '../store/transactionStore';
import { toastService } from '../services/toastService';


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  hasRole: (role: string | string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const transactionStore = useTransactionStore.getState();
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify auth token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Try to refresh user data to validate token
          try {
            const res = await authApi.getCurrentUser();
            if (res.data) {
              setUser(res.data);
              setIsAuthenticated(true);
              localStorage.setItem('auth_user', JSON.stringify(res.data));
            } else {
              // Invalid token
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch {
            // Token invalid, clear auth
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      try {
        const response = await authApi.login({ username, password });
        // Handle the backend response structure: { success: true, data: { token, user } }
        if (response.success && response.data && response.data.token && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('auth_user', JSON.stringify(response.data.user));
          // Store shop info in Zustand store for global access
          if (response.data.user.shop_id) {
            // Set a minimal Shop object; fill with more fields if required by your Shop type
            transactionStore.setShop({
              id: response.data.user.shop_id,
              name: '',
              owner_id: response.data.user.id,
              address: '',
              contact: '',
              commission_rate: 0,
              status: 'active',
              created_at: '',
              updated_at: ''
            });
          } else {
            transactionStore.setShop(null);
          }
          if (response.data.user.role === 'owner') {
            window.location.href = '/owner';
          } else if (response.data.user.role === 'superadmin') {
            window.location.href = '/superadmin';
          }
        } else {
          console.error('Invalid response format. Expected success=true with token and user, got:', response);
          const errorMsg = 'Invalid response format';
          setError(errorMsg);
          toastService.authError(errorMsg);
          setIsAuthenticated(false);
        }
      } catch (err) {
        let errorMsg = 'Login failed';
        if (err && typeof err === 'object' && 'message' in err) {
          errorMsg = (err as { message?: string }).message || errorMsg;
        }
        setError(errorMsg);
        toastService.authError(errorMsg);
        setIsAuthenticated(false);
      }
    } catch (err) {
      let errorMsg = 'Login failed';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = (err as { message?: string }).message || errorMsg;
      }
      setError(errorMsg);
      toastService.authError(errorMsg);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getCurrentUser();
      if (res.data) {
        setUser(res.data);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(res.data));
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  };

  const clearError = () => setError(null);

  const hasRole = (role: string | string[]) => {
    if (!user?.role) return false;
    const userRole = user.role.toLowerCase();
    if (Array.isArray(role)) {
      return role.map(r => r.toLowerCase()).includes(userRole);
    }
    return userRole === role.toLowerCase();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading, 
      error, 
      login, 
      logout, 
      clearError, 
      hasRole,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
