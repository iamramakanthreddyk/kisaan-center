import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { UserRepository } from '../repositories/UserRepository';
import { ValidationError, AuthorizationError, NotFoundError } from '../shared/utils/errors';
import {
	getCurrentUser,
	createUser,
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
	resetPassword,
	adminResetPassword
} from '../controllers/userController';

const router = Router();

// Authentication disabled for testing
router.use(authenticateToken);

// Get current user profile (must be first to avoid conflict with /:id)
router.get('/me', getCurrentUser);

// User CRUD operations
router.post('/', createUser);
router.get('/', getUsers); // Role-based filtering handled in service
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Password reset (users can only reset their own password)
router.post('/:id/reset-password', resetPassword);

// Admin password reset (superadmin/owner can reset user passwords)
router.post('/:id/admin-reset-password', adminResetPassword);

// Set or clear custom commission rate for a farmer
import type { Request } from 'express';
// Ensure Request type is widened to include optional `user` at runtime checks
type ReqWithUser = Request & { user?: { id?: number; role?: string } };
router.patch('/:id/commission', async (req: ReqWithUser, res) => {
	try {
		const targetId = Number(req.params.id);
		if (!targetId) return res.status(400).json({ success: false, message: 'Invalid id' });
		// runtime-safe user check (req.user may be undefined during some test setups)
		if (!req.user || req.user.role !== 'superadmin') {
			throw new AuthorizationError('Only superadmin can modify commission overrides');
		}
		const { custom_commission_rate } = req.body || {};
		if (custom_commission_rate !== null && custom_commission_rate !== undefined) {
			const n = Number(custom_commission_rate);
			if (isNaN(n) || n < 0 || n > 100) throw new ValidationError('custom_commission_rate must be between 0 and 100');
		}
		const repo = new UserRepository();
		const user = await repo.findById(targetId);
		if (!user) throw new NotFoundError('User not found');
		if (user.role !== 'farmer') throw new ValidationError('Commission override allowed only for farmers');
		const updated = await repo.update(targetId, { ...user, custom_commission_rate: custom_commission_rate == null ? null : Number(custom_commission_rate) });
		return res.json({ success: true, data: { id: updated?.id, custom_commission_rate: updated?.custom_commission_rate } });
	} catch (error: unknown) {
		const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status ?? 400 : 400;
		const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : 'Failed to update commission';
		return res.status(status).json({ success: false, message });
	}
});

export default router;
