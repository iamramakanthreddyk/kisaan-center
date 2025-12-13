export interface CreateCategoryDTO {
  name: string;
  description?: string;
  status?: string;
}

export interface CategoryResponseDTO {
  id: number;
  name: string;
  description?: string;
  status?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  status?: string;
}