export interface CreateCommissionDTO {
  shop_id: number;
  rate: number;
  type: 'percentage' | 'fixed';
}

export interface CommissionResponseDTO {
  id: number;
  shop_id: number;
  rate: number;
  type: 'percentage' | 'fixed';
  created_at: Date;
  updated_at: Date;
}

export interface UpdateCommissionDTO {
  rate?: number;
  type?: 'percentage' | 'fixed';
}