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
          try {
            const res = await authApi.getCurrentUser();
            if (res.data) {
              setUser(res.data);
              setIsAuthenticated(true);
              localStorage.setItem('auth_user', JSON.stringify(res.data));
            } else {
              // Invalid token
              console.warn('[AuthContext] Token exists but getCurrentUser returned no data');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (err) {
            // Token invalid, clear auth
            console.warn('[AuthContext] Token validation failed:', err instanceof Error ? err.message : String(err));
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
          // Store token FIRST before any async operations
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('auth_user', JSON.stringify(response.data.user));
          
          // Update state - DO NOT redirect here, let the router handle it
          setUser(response.data.user);
          setIsAuthenticated(true);
          
          // Store shop info in Zustand store for global access
          if (response.data.user.shop_id) {
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
          
          // Router will automatically redirect based on authenticated state
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
      // Clear local storage BEFORE calling logout API
      // This ensures no old token is sent with the logout request
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      
      // Notify backend about logout (best effort - ignore failures)
      try {
        await authApi.logout();
      } catch (err) {
        console.error('Logout API call failed, but continuing:', err);
      }
    } finally {
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to login page
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
