import express from 'express';
import { AuditLogController } from '../controllers';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();
const auditLogController = new AuditLogController();

router.use(authenticateToken);

router.get('/', auditLogController.getAuditLogs.bind(auditLogController));

export { router as auditLogRoutes };