import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { failureCode, success } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { Feature, UserFeatureOverride } from '../models/feature';
import { loadFeatures } from '../middlewares/features';

const router = Router();

// List all features & effective state for a user
router.get('/users/:userId', authenticateToken, requireRole(['superadmin']), loadFeatures, async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { field: 'userId' }, 'Invalid userId');
  const features = await Feature.findAll({ raw: true });
  const overrides = await UserFeatureOverride.findAll({ where: { user_id: userId }, raw: true });
  const overrideMap: Record<string, boolean> = {}; overrides.forEach(o => overrideMap[o.feature_code] = o.enabled);
  return success(res, {
    user_id: userId,
    features: features.map(f => ({
      code: f.code,
      name: f.name,
      category: f.category,
      default_enabled: f.default_enabled,
      override: overrideMap[f.code] ?? null
    }))
  });
});

// Set or clear override
router.post('/users/:userId/override', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { feature_code, enabled, reason } = req.body || {};
  if (!feature_code || typeof enabled !== 'boolean') {
    return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { required: ['feature_code','enabled'] }, 'feature_code & enabled required');
  }
  const feature = await Feature.findOne({ where: { code: feature_code } });
  if (!feature) return failureCode(res, 404, ErrorCodes.NOT_FOUND, { feature_code }, 'Feature not found');
  await UserFeatureOverride.upsert({ user_id: userId, feature_code, enabled, reason });
  return success(res, { user_id: userId, feature_code, enabled });
});

router.delete('/users/:userId/override/:feature_code', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { feature_code } = req.params;
  await UserFeatureOverride.destroy({ where: { user_id: userId, feature_code } });
  return success(res, { removed: true, user_id: userId, feature_code });
});

export default router;