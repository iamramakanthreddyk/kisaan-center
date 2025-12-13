import { Router } from 'express';
import { BalanceSnapshotController } from '../controllers';

const router = Router();
const controller = new BalanceSnapshotController();

// POST /balance-snapshots
router.post('/', (req, res) => controller.createSnapshot(req, res));
// GET /balance-snapshots/:user_id
router.get('/:user_id', (req, res) => controller.getSnapshots(req, res));
// GET /balance-snapshots/user/:user_id (alternative route for frontend compatibility)
router.get('/user/:user_id', (req, res) => controller.getSnapshots(req, res));

export default router;
