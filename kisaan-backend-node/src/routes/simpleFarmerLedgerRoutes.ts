/**
 * SIMPLE FARMER LEDGER ROUTES - INDEPENDENT COMPONENT
 *
 * ⚠️  IMPORTANT: These routes manage an INDEPENDENT ledger system!
 *
 * Endpoints: /api/simple-ledger/*
 * - NOT connected to main accounting (kisaan_ledger_entries)
 * - Maintains separate balance tracking for UI purposes
 * - Uses simplified data model without transaction FK relationships
 *
 * For financial reporting and audit trails, use main ledger endpoints.
 */


import { Router } from 'express';
import * as controller from '../controllers/simpleFarmerLedgerController';
import { authenticateToken } from '../middlewares/auth';
import { shopAccessGuard, farmerReadOnlyGuard, ownerOnlyGuard } from '../middleware/accessGuards';
import { loadFeatures, requireFeature } from '../middlewares/features';
import { trackUserActivity } from '../middlewares/activityTracker';


const router = Router();
// All routes require authentication
router.use(authenticateToken);
// Track user activity on all ledger operations
router.use(trackUserActivity);
// Load features for all routes
router.use(loadFeatures);

// Batch create endpoint (moved after router declaration)
router.post('/batch', ownerOnlyGuard, controller.createBatchEntries);

// Owner commission summary: only shop owner can view
router.get('/owner-commission', ownerOnlyGuard, controller.getOwnerCommissionSummary);

// Create, update, delete require shop owner/employee
router.post('/', shopAccessGuard, controller.createEntry);
router.put('/:id', shopAccessGuard, controller.updateEntry);
router.delete('/:id', shopAccessGuard, controller.deleteEntry);

// List, balance, summary: owner/employee full, farmer read-only
router.get('/', farmerReadOnlyGuard, controller.listEntries);
router.get('/balance', authenticateToken, controller.getFarmerBalance);
router.get('/summary', farmerReadOnlyGuard, controller.getSummary);
router.get('/export', farmerReadOnlyGuard, requireFeature('ledger.export'), controller.exportCsv);
// Earnings: only shop owners/employees can view earnings
router.get('/earnings', shopAccessGuard, controller.getEarnings);

export default router;
