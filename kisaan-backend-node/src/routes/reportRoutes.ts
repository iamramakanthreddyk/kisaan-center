import { Router } from 'express';
import { generateReport, downloadReport } from '../controllers/reportController';
import { authenticateToken } from '../middlewares/auth';
import { loadFeatures, requireReportGenerate, requireReportDownload, enforceRetention } from '../middlewares/features';

const router = Router();

// Generate report (JSON or HTML)
router.get('/generate', authenticateToken, loadFeatures, requireReportGenerate, enforceRetention('date_from','date_to'), generateReport);

// Download report as file
router.get('/download', authenticateToken, loadFeatures, requireReportDownload, enforceRetention('date_from','date_to'), downloadReport);

export default router;