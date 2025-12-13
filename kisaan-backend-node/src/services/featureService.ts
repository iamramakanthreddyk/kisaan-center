import { Feature } from '../models/feature';
import { PlanFeature } from '../models/feature';
import { UserFeatureOverride } from '../models/feature';
import { User } from '../models/user';
import sequelize from '../config/database';

export interface EffectiveFeaturesResult {
  userId: number;
  planId?: number | null;
  features: Record<string, boolean>;
  retentionDays: number; // applied data retention window for history endpoints
  source: {
    plan?: number | null;
    overrides: string[];
    defaults: string[];
  }
}

// Defaults
const FALLBACK_RETENTION_DAYS = 7; // if user not entitled to full history
const FULL_RETENTION_DAYS = 365 * 10; // effectively unlimited

export class FeatureService {
  static async getEffectiveFeatures(userId: number): Promise<EffectiveFeaturesResult> {
    const user = await User.findByPk(userId, { raw: true });
    if (!user) {
      return { userId, planId: null, features: {}, retentionDays: FALLBACK_RETENTION_DAYS, source: { overrides: [], defaults: [], plan: null } };
    }

    // Load all features
    const featureRows = await Feature.findAll({ raw: true });
    const base: Record<string, boolean> = {};
    featureRows.forEach(f => { base[f.code] = !!f.default_enabled; });
    const defaultsEnabled = Object.entries(base).filter(([_key, v]) => v).map(([c]) => c);

  const planFeatures: Record<string, boolean> = {};
    if (user.shop_id) {
      // fetch plan id for that shop (join via Shop) using raw SQL to minimize model complexity
      const [rows] = await sequelize.query(`SELECT s.plan_id FROM kisaan_shops s WHERE s.id = :sid`, { replacements: { sid: user.shop_id } });
  const planId = (rows as unknown as { plan_id?: number }[])[0]?.plan_id;
      if (planId) {
        const planFeatureRows = await PlanFeature.findAll({ where: { plan_id: planId }, raw: true });
        planFeatureRows.forEach(pf => { planFeatures[pf.feature_code] = pf.enabled; });
      }
    }

    const overrides = await UserFeatureOverride.findAll({ where: { user_id: userId }, raw: true });
    const overrideCodes: string[] = [];
    overrides.forEach(o => { base[o.feature_code] = o.enabled; overrideCodes.push(o.feature_code); });

    // Merge plan features (plan overrides default, then user overrides final)
    Object.entries(planFeatures).forEach(([code, enabled]) => { base[code] = enabled; });
    overrides.forEach(o => { base[o.feature_code] = o.enabled; });

    // Compute retention logic
    const fullHistory = base['transactions.history.full'] || base['data.retention.unlimited'];
    const retentionDays = fullHistory ? FULL_RETENTION_DAYS : FALLBACK_RETENTION_DAYS;

    return {
      userId: user.id,
      planId: undefined, // could populate if needed
      features: base,
      retentionDays,
      source: { plan: undefined, overrides: overrideCodes, defaults: defaultsEnabled }
    };
  }
}

export default FeatureService;