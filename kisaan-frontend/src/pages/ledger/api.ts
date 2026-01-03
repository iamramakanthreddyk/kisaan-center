// API utility for simple ledger (uses centralized apiClient)
import { apiClient } from '../../services/apiClient';

export type LedgerEntriesResponse = {
  entries: Array<{
    id: number;
    shop_id: number;
    farmer_id: number;
    amount: number;
    commission_amount?: number;
    net_amount?: number;
    type: string;
    category: string;
    notes?: string;
    transaction_date?: string;
    created_at?: string;
    created_by: number;
  }>;
  total: number;
  page: number;
  page_size: number;
};

export async function fetchLedgerEntries(
  shopId: number,
  farmerId?: number,
  from?: string,
  to?: string,
  category?: string,
  page?: number,
  page_size?: number
): Promise<LedgerEntriesResponse> {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (farmerId != null) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  if (page) params.append('page', String(page));
  if (page_size) params.append('page_size', String(page_size));
  const qs = `?${params.toString()}`;
  return apiClient.get<LedgerEntriesResponse>(`/simple-ledger${qs}`);
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

export async function updateLedgerEntry(id: number, data: {
  farmer_id?: number;
  type?: string;
  category?: string;
  amount?: number;
  notes?: string;
  entry_date?: string;
}) {
  return apiClient.put(`/simple-ledger/${id}`, data);
}

export async function deleteLedgerEntry(id: number, reason?: string) {
  return apiClient.delete(`/simple-ledger/${id}`, { data: { reason } });
}

export async function fetchLedgerSummary(
  shopId: number,
  period?: 'weekly' | 'monthly',
  farmerId?: number,
  from?: string,
  to?: string,
  category?: string
): Promise<{
  period: Array<{
    period: string;
    credit: string | number;
    debit: string | number;
    commission: string | number;
    balance: string | number;
  }>;
  overall: {
    credit: string | number;
    debit: string | number;
    commission: string | number;
    balance: string | number;
  };
}> {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (period) params.append('period', period);
  if (farmerId != null) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  const qs = `?${params.toString()}`;
  return apiClient.get(`/simple-ledger/summary${qs}`);
}

export async function exportLedgerCsv(shopId: number, farmerId?: number, from?: string, to?: string, category?: string): Promise<Blob> {
  const params = new URLSearchParams();
  params.append('shop_id', String(shopId));
  if (farmerId != null) params.append('farmer_id', String(farmerId));
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (category) params.append('category', category);
  const qs = `?${params.toString()}`;
  // Use apiClient.fetchBlob which is designed to return a Blob
  return apiClient.fetchBlob(`/simple-ledger/export${qs}`);
}

