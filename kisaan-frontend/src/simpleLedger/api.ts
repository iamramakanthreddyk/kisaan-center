// Fetch owner commission summary (owner only)
export async function fetchOwnerCommissionSummary(
  shopId: number,
  period?: 'weekly' | 'monthly',
  from?: string,
  to?: string
) {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (period) params.append('period', period);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = `?${params.toString()}`;
  return apiClient.get(`/simple-ledger/owner-commission${qs}`);
}
// API utility for simple ledger (uses centralized apiClient)
import { apiClient } from '../services/apiClient';

export async function fetchLedgerEntries(shopId: number, farmerId?: number, from?: string, to?: string, category?: string) {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (farmerId) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  const qs = `?${params.toString()}`;
  return apiClient.get(`/simple-ledger${qs}`);
}

export async function createLedgerEntry(data: {
  shop_id: number;
  farmer_id: number;
  type: string;
  category: string;
  amount: number;
  notes?: string;
  created_by?: number;
  entry_date?: string;
}) {
  return apiClient.post('/simple-ledger', data);
}

export async function fetchLedgerSummary(
  shopId: number,
  period?: 'weekly' | 'monthly',
  farmerId?: number,
  from?: string,
  to?: string,
  category?: string
) {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (period) params.append('period', period);
  if (farmerId) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  const qs = `?${params.toString()}`;
  return apiClient.get(`/simple-ledger/summary${qs}`);
}

export async function exportLedgerCsv(shopId: number, farmerId?: number, from?: string, to?: string, category?: string): Promise<Blob> {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (farmerId) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  const qs = `?${params.toString()}`;
  // Use apiClient.fetchBlob which is designed to return a Blob
  return apiClient.fetchBlob(`/simple-ledger/export${qs}`);
}
