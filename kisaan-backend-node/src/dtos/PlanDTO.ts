export interface PlanDTO {
  id?: number;
  name: string;
  description?: string | null;
  features: string | unknown[];
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface PlanCreateDTO {
  name: string;
  description?: string | null;
  features: unknown[];
  is_active?: boolean;
}

export interface PlanUpdateDTO {
  name?: string;
  description?: string | null;
  features?: unknown[];
  is_active?: boolean;
}