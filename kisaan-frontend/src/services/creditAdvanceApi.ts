import { apiClient } from './apiClient';

// New canonical API for advances: use expenses with type=advance and settlements for repayments
export const creditAdvanceApi = {
  getAll: async (shop_id?: string) => {
    // GET /expenses?type=advance&shop_id=...
    const query = shop_id ? `?type=advance&shop_id=${encodeURIComponent(shop_id)}` : '?type=advance';
    const res = await apiClient.get<{ data?: unknown[] } | unknown[]>(`/expenses${query}`);
    if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data?: unknown[] }).data)) return (res as { data?: unknown[] }).data;
    if (Array.isArray(res)) return res;
    return [];
  },

  issue: async (payload: { user_id: string; shop_id: string; amount: number; issued_date?: string; due_date?: string; description?: string }) => {
    // POST /expenses with type: 'advance'
    const body = {
      shop_id: payload.shop_id,
      user_id: payload.user_id,
      amount: payload.amount,
      type: 'advance',
      issued_date: payload.issued_date,
      due_date: payload.due_date,
      description: payload.description || 'Advance issued from UI'
    };
    return apiClient.post('/expenses', body);
  },

  repay: async (payload: { credit_id: number; amount: number }) => {
    // Use settlement endpoint to apply repayment against an expense
    // POST /settlements/settle/:settlement_id  or POST /settlements/expense to create a settlement record.
    // Here we call POST /settlements/settle/:id with body { amount }
    return apiClient.post(`/settlements/settle/${payload.credit_id}`, { amount: payload.amount });
  }
};