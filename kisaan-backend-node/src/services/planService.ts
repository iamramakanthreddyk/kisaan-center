import { PlanRepository } from '../repositories/PlanRepository';
import { PlanEntity } from '../entities/PlanEntity';
import { PlanCreateDTO, PlanUpdateDTO, PlanDTO } from '../dtos';
import { StringFormatter } from '../shared/utils/formatting';
import { BusinessRuleError, DatabaseError, ValidationError } from '../shared/utils/errors';
import { BaseService } from './baseService';

export class PlanService extends BaseService<PlanEntity, PlanDTO> {
  // getDefaultPlan simplified: no status concept, just return plan named 'Basic' if exists
  async getDefaultPlan(): Promise<PlanDTO | null> {
    try {
      const plans = await this.planRepository.findAll();
      const basicPlan = plans.find(p => p.name?.toLowerCase() === 'basic');
      return basicPlan ? basicPlan.toDTO() : null;
    } catch (error) {
      throw new DatabaseError('Failed to fetch default plan', error instanceof Error ? { message: error.message } : undefined);
    }
  }
  private planRepository: PlanRepository;

  constructor() {
    super();
    this.planRepository = new PlanRepository();
  }

  protected get repository() { return this.planRepository; }
  protected toDTO(entity: PlanEntity): PlanDTO { return entity.toDTO(); }

  async createPlan(data: PlanCreateDTO): Promise<PlanDTO> {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        throw new ValidationError('Plan name is required');
      }

      // Sanitize input
      const sanitizedData = {
        ...data,
        name: StringFormatter.sanitizeInput(data.name.trim()),
        description: data.description ? StringFormatter.sanitizeInput(data.description.trim()) : null,
        features: data.features || []
      };

      // Check for duplicate plan name
      const existingPlans = await this.planRepository.searchByName(sanitizedData.name);
      if (existingPlans.length > 0) {
        throw new BusinessRuleError('A plan with this name already exists');
      }

      const planEntity = new PlanEntity(sanitizedData);
      const createdPlan = await this.planRepository.create(planEntity);
      return createdPlan.toDTO();
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create plan', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async getAllPlans(): Promise<PlanDTO[]> {
    try {
      const plans = await this.planRepository.findAll();
      return plans.map(p => p.toDTO());
    } catch (error) {
      throw new DatabaseError('Failed to retrieve plans', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async getPlanById(id: number): Promise<PlanDTO | null> { return this.getById(id); }

  async updatePlan(id: number, data: PlanUpdateDTO): Promise<PlanDTO | null> {
    try {
      if (!id || id <= 0) {
        throw new ValidationError('Invalid plan ID');
      }

      const existingPlan = await this.planRepository.findById(id);
      if (!existingPlan) {
        return null;
      }

  // Sanitize input data
  const sanitizedData: Record<string, unknown> = {};
      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new ValidationError('Plan name cannot be empty');
        }
        sanitizedData.name = StringFormatter.sanitizeInput(data.name.trim());
      }
      if (data.description !== undefined) {
        sanitizedData.description = data.description ? StringFormatter.sanitizeInput(data.description.trim()) : null;
      }
      if (data.features !== undefined) {
        sanitizedData.features = data.features;
      }
      // removed status/pricing/limit/data_retention fields in simplified model

      // Check for duplicate name if name is being updated
      if (sanitizedData.name && sanitizedData.name !== existingPlan.name) {
        const plansWithSameName = await this.planRepository.searchByName(sanitizedData.name as string);
        if (plansWithSameName.some(p => p.id !== id)) {
          throw new BusinessRuleError('A plan with this name already exists');
        }
      }

      // Merge sanitizedData into the existing DTO, ensuring correct types
      const updatedDTO: PlanDTO = { ...existingPlan.toDTO(), ...sanitizedData } as PlanDTO;
      const updatedPlanEntity = new PlanEntity(updatedDTO);
      const updatedPlan = await this.planRepository.update(id, updatedPlanEntity);
      return updatedPlan ? updatedPlan.toDTO() : null;
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update plan', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async deletePlan(id: number): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new ValidationError('Invalid plan ID');
      }

      const existingPlan = await this.planRepository.findById(id);
      if (!existingPlan) {
        return false;
      }

      await this.planRepository.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete plan', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async deactivatePlan(id: number): Promise<PlanDTO | null> {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid plan ID');
      }
      const existingPlan = await this.planRepository.findById(id);
      if (!existingPlan) {
        return null;
      }
      // raw update since repository may not have status concept
  const [count] = await (this as unknown as { planRepository: { model: { update: (values: unknown, options: unknown) => Promise<[number]> } } }).planRepository['model'].update({ is_active: false }, { where: { id } });
      if (count === 0) return null;
      const updated = await this.planRepository.findById(id);
      return updated ? updated.toDTO() : null;
    } catch (error: unknown) {
      throw new DatabaseError('Failed to deactivate plan', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  // deactivatePlan and getActivePlans removed: no status concept

  async searchPlans(searchTerm: string): Promise<PlanDTO[]> {
    try {
      if (!searchTerm?.trim()) {
        throw new ValidationError('Search term is required');
      }

      const sanitizedSearchTerm = StringFormatter.sanitizeInput(searchTerm.trim());
      const plans = await this.planRepository.searchByName(sanitizedSearchTerm);
      return plans.map(plan => plan.toDTO());
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to search plans', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  // getPlansByPriceRange removed: no pricing fields
}
