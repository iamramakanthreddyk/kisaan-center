import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

interface AuditLog {
  id: number;
  shop_id: number;
  user_id: number;
  action: 'transaction_created' | 'payment_recorded' | 'payment_due' | 'service_suspended' | 'service_restored';
  entity_type: 'transaction' | 'payment' | 'service';
  entity_id: number;
  old_values?: string;
  new_values?: string;
  created_at: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  shop?: {
    id: number;
    name: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Convert audit log to notification
const auditLogToNotification = (auditLog: AuditLog): Notification | null => {
  const getNotificationDetails = (action: string, user?: { username: string; firstname?: string }) => {
    // Skip notifications if user information is missing
    if (!user?.username) {
      return null;
    }
    
    // Use firstname if available, otherwise fallback to username
    const displayName = user.firstname && user.firstname.trim() ? user.firstname : user.username;
    
    switch (action) {
      case 'transaction_created':
        return {
          title: 'New Transaction',
          message: `${displayName} created a new transaction`,
          type: 'success' as const,
          actionLabel: 'View Transaction',
          actionUrl: '/transactions'
        };
      case 'payment_recorded':
        return {
          title: 'Payment Recorded',
          message: `${displayName} recorded a payment`,
          type: 'info' as const,
          actionLabel: 'View Payment',
          actionUrl: '/payments'
        };
      case 'payment_due':
        return {
          title: 'Payment Due Warning',
          message: `Your payment is overdue. Services may be suspended.`,
          type: 'error' as const,
          actionLabel: 'Make Payment',
          actionUrl: '/billing'
        };
      case 'service_suspended':
        return {
          title: 'Services Suspended',
          message: `Your services have been suspended due to overdue payment.`,
          type: 'error' as const,
          actionLabel: 'Contact Support',
          actionUrl: '/billing'
        };
      case 'service_restored':
        return {
          title: 'Services Restored',
          message: `Your services have been restored after payment confirmation.`,
          type: 'success' as const,
          actionLabel: 'Continue',
          actionUrl: '/dashboard'
        };
      default:
        return {
          title: 'System Activity',
          message: `${displayName} performed ${action}`,
          type: 'info' as const,
          actionLabel: 'View Details',
          actionUrl: '/dashboard'
        };
    }
  };

  const details = getNotificationDetails(auditLog.action, auditLog.user);
  
  // Skip notification if details are null (missing user info)
  if (!details) {
    return null;
  }
  
  return {
    id: auditLog.id.toString(),
    ...details,
    timestamp: new Date(auditLog.created_at),
    read: false
  };
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch audit logs from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
  const response = await apiClient.get('/audit-logs') as unknown;
      
      if (
        response &&
        typeof response === 'object' &&
        'success' in response &&
        (response as { success?: boolean }).success &&
        'data' in response &&
        Array.isArray((response as { data?: unknown[] }).data)
      ) {
        const notificationData = ((response as { data: unknown[] }).data as AuditLog[])
          .map(auditLogToNotification)
          .filter((notification: Notification | null): notification is Notification => notification !== null)
          .filter((notification: Notification) => {
            // Filter out transaction notifications for owners
            if (user?.role === 'owner' && notification.title === 'New Transaction') {
              return false;
            }
            return true;
          });
        setNotifications(notificationData);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Fallback to empty notifications on error
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load notifications on mount and when auth changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};