import { PlanDTO } from '../dtos';

export class PlanEntity {
  id?: number;
  name: string;
  description?: string | null;
  features: unknown[];
  is_active?: boolean; // surfaced for deactivate semantics
  created_at?: Date;
  updated_at?: Date;

  constructor(data: PlanDTO) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    if (typeof data.features === 'string') {
      try { this.features = JSON.parse(data.features); } catch { this.features = []; }
    } else {
      this.features = data.features || [];
    }
    // Support either camel or snake case from model/DTO
  this.is_active = (data as { is_active?: boolean; isActive?: boolean }).is_active !== undefined ? (data as { is_active?: boolean; isActive?: boolean }).is_active : (data as { is_active?: boolean; isActive?: boolean }).isActive;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toDTO(): PlanDTO {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      features: this.features,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    } as PlanDTO;
  }
}