/**
 * Global Toast API Hooks
 * Provides pre-configured hooks for common operations with toast notifications
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { toastService } from '../services/toastService';

// Generic mutation hook with toast support
export function useToastMutation<TData, TVariables>({
  mutationFn,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  invalidateQueries,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  invalidateQueries?: string[][];
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (successMessage) {
        toastService.success(successMessage);
      }
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      if (errorMessage) {
        toastService.error(errorMessage);
      } else {
        toastService.apiError(error);
      }
      onError?.(error, variables);
    },
  });
}

// Pre-configured hooks for common operations

// Create operations
export function useCreateWithToast<TData, TVariables>(
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) {
  return useToastMutation<TData, TVariables>({
    mutationFn: (data: TVariables) => apiClient.post<TData>(endpoint, data),
    successMessage: options?.successMessage || 'Created successfully',
    errorMessage: options?.errorMessage,
    invalidateQueries: options?.invalidateQueries,
  });
}

// Update operations
export function useUpdateWithToast<TData, TVariables>(
  endpoint: (id: string) => string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) {
  return useToastMutation<TData, TVariables & { id: string }>({
    mutationFn: ({ id, ...data }: TVariables & { id: string }) => 
      apiClient.put<TData>(endpoint(id), data),
    successMessage: options?.successMessage || 'Updated successfully',
    errorMessage: options?.errorMessage,
    invalidateQueries: options?.invalidateQueries,
  });
}

// Delete operations
export function useDeleteWithToast<TData = void>(
  endpoint: (id: string) => string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) {
  return useToastMutation<TData, string>({
    mutationFn: (id: string) => apiClient.delete<TData>(endpoint(id)),
    successMessage: options?.successMessage || 'Deleted successfully',
    errorMessage: options?.errorMessage,
    invalidateQueries: options?.invalidateQueries,
  });
}

// Bulk operations
export function useBulkOperationWithToast<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) {
  return useToastMutation<TData, TVariables>({
    mutationFn,
    successMessage: options?.successMessage || 'Bulk operation completed',
    errorMessage: options?.errorMessage,
    invalidateQueries: options?.invalidateQueries,
  });
}

// Authentication operations
export function useAuthMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (options?.successMessage) {
        toastService.authSuccess(options.successMessage);
      }
    },
    onError: (error: Error) => {
      if (options?.errorMessage) {
        toastService.authError(options.errorMessage);
      } else {
        toastService.authError(error.message);
      }
    },
  });
}

// Export toast service for direct usage
export { toastService };