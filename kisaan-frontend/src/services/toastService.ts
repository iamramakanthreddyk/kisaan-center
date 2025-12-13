/**
 * Global Toast Service
 * Provides centralized toast notifications for all API responses and user actions
 */

import { toast } from '@/hooks/use-toast';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
}

class ToastService {
  /**
   * Show a success toast notification
   */
  success(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return toast({
      title: options?.title || 'Success',
      description: message,
      variant: 'success',
      duration: options?.duration || 3000,
      ...options,
    });
  }

  /**
   * Show an error toast notification
   */
  error(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return toast({
      title: options?.title || 'Error',
      description: message,
      variant: 'destructive',
      duration: options?.duration || 5000,
      ...options,
    });
  }

  /**
   * Show an info toast notification
   */
  info(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return toast({
      title: options?.title || 'Info',
      description: message,
      variant: 'info',
      duration: options?.duration || 4000,
      ...options,
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return toast({
      title: options?.title || 'Warning',
      description: message,
      variant: 'warning',
      duration: options?.duration || 4000,
      ...options,
    });
  }

  /**
   * Handle API success responses with automatic toast
   */
  apiSuccess(response: unknown, customMessage?: string) {
    const message = typeof response === 'object' && response && 'message' in response
      ? (customMessage || (response as { message?: string }).message || 'Operation completed successfully')
      : (customMessage || 'Operation completed successfully');
    return this.success(message);
  }

  /**
   * Handle API error responses with automatic toast
   */
  apiError(error: unknown, customMessage?: string) {
    let message = customMessage;
    if (!message) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response === 'object' &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        message = (error as { response: { data: { message: string } } }).response.data.message;
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: string }).message === 'string'
      ) {
        message = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        message = 'An unexpected error occurred';
      }
    }
    return this.error(message!);
  }

  /**
   * Handle loading state with toast
   */
  loading(message: string = 'Loading...') {
    return toast({
      title: 'Loading',
      description: message,
      duration: Infinity, // Keep loading toast until dismissed
    });
  }

  /**
   * Dismiss a specific toast
   */
  dismiss() {
    // The useToast hook provides dismiss functionality
    // This method allows external dismissal if needed
    return toast({ 
      title: '',
      description: '',
      duration: 0
    });
  }

  /**
   * Show a toast for authentication events
   */
  authSuccess(message: string = 'Authentication successful') {
    return this.success(message, { title: 'Welcome!' });
  }

  authError(message: string = 'Authentication failed') {
    return this.error(message, { title: 'Authentication Error' });
  }

  /**
   * Show a toast for validation errors
   */
  validationError(message: string) {
    return this.error(message, { title: 'Validation Error' });
  }

  /**
   * Show a toast for network errors
   */
  networkError(message: string = 'Network connection failed') {
    return this.error(message, { title: 'Connection Error' });
  }

  /**
   * Show a toast for permission errors
   */
  permissionError(message: string = 'You do not have permission to perform this action') {
    return this.error(message, { title: 'Permission Denied' });
  }
}

// Create singleton instance
export const toastService = new ToastService();

// Export for direct usage
export default toastService;