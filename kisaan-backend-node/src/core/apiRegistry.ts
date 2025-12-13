// API Registry - Simple Implementation
import express, { Application, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { loadFeatures, requireFeature } from '../middlewares/features';
import { success } from '../shared/http/respond';
import { Transaction } from '../models/transaction';
import { logger } from '../shared/logging/logger';
import * as allRoutes from '../routes';

export interface ApiModule {
  name: string;
  prefix: string;
  description: string;
  endpoints: Array<unknown>;
}

export class ApiRegistry {
  private modules = new Map<string, ApiModule>();

  constructor() {
    console.log('API Registry initialized');
    // Add some default modules to satisfy the interface
    this.modules.set('default', {
      name: 'default',
      prefix: '/default',
      description: 'Default module',
      endpoints: []
    });
  }

  getModules(): ApiModule[] {
    return Array.from(this.modules.values());
  }

  _endpoints: Array<{ method: string; path: string }> = [];

  registerRoutes(app: Application): void {
    console.log('🔧 Registering API routes via direct imports...');
    try {
      // Use directly imported routes instead of dynamic require
      const routes = allRoutes;
      
      // Validate that routes are loaded
      console.log('🔎 Loaded route keys:', Object.keys(routes));
      
      // Add a debug log for each route registration
      for (const [key, value] of Object.entries(routes)) {
        if (!value) {
          console.warn(`⚠️  Route '${key}' is undefined or null!`);
        } else if (key !== 'default') {
          console.log(`✅ Route '${key}' loaded successfully`);
        }
      }

      // Helper to register and collect endpoints
      const register = (path: string, router: unknown) => {
        if (!router) {
          console.warn(`⚠️  Skipping registration of ${path} - router is null/undefined`);
          return;
        }
        console.log(`📝 Registering route: ${path}`);
        app.use(path, router as express.Router);
        let added = false;
        try {
          if (router && (router as express.Router).stack) {
            for (const layer of (router as express.Router).stack) {
              if (layer.route && layer.route.path) {
                // @ts-expect-error Express types do not expose 'methods' property
                for (const method of Object.keys(layer.route.methods)) {
                  this._endpoints.push({
                    method: method.toUpperCase(),
                    path: path + (layer.route.path === '/' ? '' : layer.route.path)
                  });
                  added = true;
                }
              }
            }
          }
        } catch (e) {
          // Fallback: if we couldn't introspect the router, add a generic GET/POST entry for the base path
        }
        if (!added) {
          this._endpoints.push({ method: 'GET', path });
          this._endpoints.push({ method: 'POST', path });
        }
      };

      // Authentication routes
      register('/api/auth', (routes as any).authRoutes);
      // User management routes
      register('/api/users', (routes as any).userRoutes);
      register('/api/superadmin', (routes as any).superadminRoutes);
      // Shop and category management
      register('/api/shops', (routes as any).shopRoutes);
      register('/api/categories', (routes as any).categoryRoutes);
      register('/api/shop-categories', (routes as any).shopCategoryRoutes);
      register('/api/plans', (routes as any).planRoutes);
      // Product management
      register('/api/products', (routes as any).productRoutes);
      // Farmer & shop product assignment
      if ((routes as any).farmerProductRoutes) {
        register('/api/farmer-products', (routes as any).farmerProductRoutes);
      }
      if ((routes as any).shopProductRoutes) {
        register('/api/shop-products', (routes as any).shopProductRoutes);
      }
      // Transaction and payment processing (enhanced with backdated support)
      register('/api/transactions', (routes as any).transactionRoutes);
      register('/api/credit-advances', (routes as any).creditAdvanceRoutes);
      // Financial management
      register('/api/balances', (routes as any).balanceRoutes);
      register('/api/balance-snapshots', (routes as any).balanceSnapshotRoutes);
      register('/api/balance', (routes as any).balanceReconciliationRoutes);
      register('/api/commissions', (routes as any).commissionRoutes);
      register('/api/settlements', (routes as any).settlementRoutes);
      // Expense routes
      if ((routes as any).expenseRoutes) {
        register('/api/expenses', (routes as any).expenseRoutes);
      }
      // Development/diagnostic routes
      if ((routes as any).debugRoutes) {
        register('/api/debug', (routes as any).debugRoutes);
      }
      // Reporting and auditing
      register('/api/reports', (routes as any).reportRoutes);
      register('/api/audit-logs', (routes as any).auditLogRoutes);
      register('/api/features-admin', (routes as any).featureAdminRoutes);
      // Dashboard routes
      register('/api/owner-dashboard', (routes as any).ownerDashboardRoute);
      // Simplified transaction system - clear user experience
      if ((routes as any).simplifiedRoutes) {
        register('/api/simple', (routes as any).simplifiedRoutes);
        console.log('✅ Simplified transaction routes registered at /api/simple');
      }
      // Simple Farmer Ledger Book-Keeping
      if ((routes as any).simpleFarmerLedgerRoutes) {
        register('/api/simple-ledger', (routes as any).simpleFarmerLedgerRoutes);
        console.log('✅ Simple Farmer Ledger routes registered at /api/simple-ledger');
      }
      
      // Diagnostics routes (commission integrity)
      try {
        const diagnostics = express.Router();
        diagnostics.get('/commission-integrity', authenticateToken, loadFeatures, requireFeature('diagnostics.integrity'), async (req: Request, res: Response) => {
          try {
            const started = Date.now();
            const txns = await Transaction.findAll();
            let raw = 0; let recomputed = 0; let mismatches = 0; const samples: Array<Record<string, unknown>> = [];
            for (const t of txns) {
              const qty = Number(((t as unknown as Record<string, unknown>).quantity) || 0);
              const up = Number(((t as unknown as Record<string, unknown>).unit_price) || 0);
              const rate = Number(((t as unknown as Record<string, unknown>).commission_rate) || 0);
              const stored = Number(((t as unknown as Record<string, unknown>).commission_amount) || 0);
              raw += stored;
              const rc = Number(((qty * up * rate) / 100).toFixed(2));
              recomputed += rc;
              if (Math.abs(stored - rc) > 0.01) {
                mismatches++;
                if (samples.length < 10) samples.push({ id: ((t as unknown as Record<string, unknown>).id), stored, rc, rate, qty, up });
              }
            }
            const payload = {
              txn_count: txns.length,
              raw_commission: Number(raw.toFixed(2)),
              recomputed_commission: Number(recomputed.toFixed(2)),
              delta: Number((raw - recomputed).toFixed(2)),
              mismatches,
              mismatch_samples: samples,
              duration_ms: Date.now() - started
            };
            try { logger.info({ ...payload }, '[Diagnostics] commission-integrity'); } catch(_err){ void _err; }
            success(res, payload);
          } catch (e: unknown) {
            const errMsg = (typeof e === 'object' && e && 'message' in e) ? (e as { message?: string }).message : undefined;
            res.status(500).json({ success: false, error: errMsg || 'diagnostics_failed' });
          }
        });
        app.use('/api/diagnostics', diagnostics);
      } catch (diagErr: unknown) {
        const errMsg = (typeof diagErr === 'object' && diagErr && 'message' in diagErr) ? (diagErr as { message?: string }).message : undefined;
        console.warn('Diagnostics route registration failed (non-fatal):', errMsg || diagErr);
      }
      
      console.log('✅ All API routes registered successfully');
      console.log('📋 Registered endpoints (' + this._endpoints.length + ' total):');
      for (const ep of this._endpoints) {
        console.log(`   • ${ep.method.padEnd(6)} ${ep.path}`);
      }
      if (this._endpoints.length === 0) {
        console.warn('⚠️  WARNING: No endpoints were registered! This may indicate an issue with route registration.');
      }
    } catch (error) {
      console.error('❌ Error loading routes:', error);
      console.log('⚠️  Continuing with stub routes...');
    }
  }

  getAllEndpoints() {
    return this._endpoints.slice();
  }

  getOpenApiSpec() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Kisaan Center API',
        version: '1.0.0'
      },
      paths: {}
    };
  }


  generateSummary() {
    return 'API Registry: Manual route registration mode';
  }
}

export const apiRegistry = new ApiRegistry();
export default apiRegistry;
