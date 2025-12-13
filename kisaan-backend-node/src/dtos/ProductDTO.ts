export interface CreateProductDTO {
  name: string;
  category_id: number;
  description?: string;
  unit?: string;
}

export interface ProductResponseDTO {
  id: number;
  name: string;
  category_id: number;
  description?: string;
  unit?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProductDTO {
  name?: string;
  category_id?: number;
  description?: string;
  unit?: string;
}