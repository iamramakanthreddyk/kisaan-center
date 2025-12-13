// Route Registration - Centralized route management
import { Express } from 'express';

// Import all routes
import {
  userRoutes,
  shopRoutes,
  planRoutes,
  categoryRoutes,
  shopCategoryRoutes,
  transactionRoutes,
  paymentRoutes,
  commissionRoutes,
  auditLogRoutes,
  balanceRoutes,
  productRoutes,
  reportRoutes,
  balanceSnapshotRoutes,
  authRoutes,
  creditAdvanceRoutes,
  creditRoutes,
  settlementRoutes,
  ownerDashboardRoute,
  superadminRoutes,
  testProductRoutes,
  farmerProductRoutes,
  balanceReconciliationRoutes
} from '../routes';

/**
 * Register all API routes with the Express app
 */
export function registerAllRoutes(app: Express): void {
  console.log('🔧 Registering API routes...');
  
  try {
    // Authentication routes
    app.use('/api/auth', authRoutes);
    
    // User management routes
    app.use('/api/users', userRoutes);
    app.use('/api/superadmin', superadminRoutes);
    
    // Shop and category management
    app.use('/api/shops', shopRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/shop-categories', shopCategoryRoutes);
    app.use('/api/plans', planRoutes);
    
    // Product management
    app.use('/api/products', productRoutes);
    app.use('/api/test-products', testProductRoutes);
  app.use('/api/farmer-products', farmerProductRoutes);
    
    // Transaction and payment processing
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/credit-advances', creditAdvanceRoutes);
  app.use('/api/credits', creditRoutes);
    
    // Financial management
    app.use('/api/balances', balanceRoutes);
    app.use('/api/balance-snapshots', balanceSnapshotRoutes);
    app.use('/api/balance', balanceReconciliationRoutes);
    app.use('/api/commissions', commissionRoutes);
    app.use('/api/settlements', settlementRoutes);
    
    // Reporting and auditing
    app.use('/api/reports', reportRoutes);
    app.use('/api/audit-logs', auditLogRoutes);
  // Expense routes
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expenseRoutes = require('../routes/expenseRoutes').default;
  app.use('/api/expenses', expenseRoutes);
  // Dev debug endpoints (owner-only)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const debugRoutes = require('../routes/debugRoutes').default;
  app.use('/api/debug', debugRoutes);
    
    // Dashboard routes
    app.use('/api/owner-dashboard', ownerDashboardRoute);

    console.log('✅ All API routes registered successfully');
    console.log('📋 Registered routes:');
    console.log('   • /api/auth/* - Authentication');
    console.log('   • /api/users/* - User management');
    console.log('   • /api/shops/* - Shop management');
    console.log('   • /api/categories/* - Category management');
    console.log('   • /api/products/* - Product management');
  console.log('   • /api/farmer-products/* - Farmer product assignments');
    console.log('   • /api/transactions/* - Transaction processing');
    console.log('   • /api/payments/* - Payment processing');
  console.log('   • /api/credits/* - Manual credits & charges');
    console.log('   • /api/balances/* - Balance management');
    console.log('   • /api/reports/* - Reporting');
    console.log('   • And more...');
    
    return;
  } catch (error) {
    console.error('❌ Error registering API routes:', error);
    throw error;
  }
}

/**
 * Get list of all registered routes for documentation
 */
export function getRegisteredRoutes() {
  return [
    { path: '/api/auth', description: 'Authentication endpoints' },
    { path: '/api/users', description: 'User management' },
    { path: '/api/superadmin', description: 'Super admin operations' },
    { path: '/api/shops', description: 'Shop management' },
    { path: '/api/categories', description: 'Category management' },
    { path: '/api/shop-categories', description: 'Shop category assignments' },
    { path: '/api/plans', description: 'Subscription plans' },
    { path: '/api/products', description: 'Product management' },
    { path: '/api/test-products', description: 'Test product operations' },
    { path: '/api/transactions', description: 'Transaction processing' },
    { path: '/api/payments', description: 'Payment processing' },
    { path: '/api/credit-advances', description: 'Credit advance management' },
  { path: '/api/credits', description: 'Manual credits and charges' },
    { path: '/api/balances', description: 'Balance management' },
    { path: '/api/balance-snapshots', description: 'Balance snapshots' },
    { path: '/api/commissions', description: 'Commission management' },
    { path: '/api/settlements', description: 'Settlement processing' },
    { path: '/api/reports', description: 'Reporting and analytics' },
    { path: '/api/audit-logs', description: 'Audit logging' },
    { path: '/api/owner-dashboard', description: 'Owner dashboard' }
  ];
}