import { Feature, PlanFeature, UserFeatureOverride } from '../models/feature';
import { ModelStatic } from 'sequelize';

export class FeatureRepository {
  private featureModel: ModelStatic<Feature> = Feature;
  private planFeatureModel: ModelStatic<PlanFeature> = PlanFeature;
  private userFeatureOverrideModel: ModelStatic<UserFeatureOverride> = UserFeatureOverride;

  async getFeaturesForPlan(planId: number) {
    return this.planFeatureModel.findAll({ where: { plan_id: planId } });
  }

  async getFeaturesForUser(userId: number) {
    return this.userFeatureOverrideModel.findAll({ where: { user_id: userId } });
  }

  async enableFeatureForPlan(planId: number, featureCode: string) {
  return this.planFeatureModel.create({ plan_id: planId, feature_code: featureCode, enabled: true });
  }

  async disableFeatureForPlan(planId: number, featureCode: string) {
    return this.planFeatureModel.destroy({ where: { plan_id: planId, feature_code: featureCode } });
  }

  async enableFeatureForUser(userId: number, featureCode: string) {
  return this.userFeatureOverrideModel.create({ user_id: userId, feature_code: featureCode, enabled: true });
  }

  async disableFeatureForUser(userId: number, featureCode: string) {
    return this.userFeatureOverrideModel.destroy({ where: { user_id: userId, feature_code: featureCode } });
  }

  async getAllFeatures() {
    return this.featureModel.findAll();
  }
}
