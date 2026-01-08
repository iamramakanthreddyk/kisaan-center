import sequelize from '../src/config/database';
import { Feature } from '../src/models/feature';

async function seedFeatures() {
  const defs = [
    { code: 'transactions.history.full', name: 'Full Transaction History', category: 'transactions', description: 'Access all historical transactions beyond default window', default_enabled: false },
    { code: 'transactions.list', name: 'List Transactions', category: 'transactions', description: 'Access paginated transaction lists', default_enabled: true },
    { code: 'transactions.analytics', name: 'Transaction Analytics', category: 'transactions', description: 'Access aggregated transaction analytics endpoints', default_enabled: true },
    { code: 'reports.generate', name: 'Generate Reports', category: 'reports', description: 'Generate JSON/Excel/PDF reports (view only)', default_enabled: true },
    { code: 'reports.download', name: 'Download Reports', category: 'reports', description: 'Download reports (PDF / Excel)', default_enabled: false },
    { code: 'data.retention.unlimited', name: 'Unlimited Data Retention', category: 'data', description: 'Bypass data retention limits', default_enabled: false },
    // New features for premium control
    { code: 'ledger.print', name: 'Print Ledger Reports', category: 'ledger', description: 'Download/print ledger reports and statements', default_enabled: false },
    { code: 'ledger.export', name: 'Export Ledger Data', category: 'ledger', description: 'Export ledger data to CSV/Excel formats', default_enabled: false },
    { code: 'auth.multiple_sessions', name: 'Multiple Concurrent Sessions', category: 'auth', description: 'Allow multiple simultaneous login sessions', default_enabled: false },
    { code: 'dashboard.advanced', name: 'Advanced Dashboard', category: 'dashboard', description: 'Access advanced analytics and detailed reports', default_enabled: false },
    { code: 'users.management', name: 'User Management', category: 'users', description: 'Create, edit, and manage user accounts', default_enabled: false }
  ];
  for (const f of defs) {
    await Feature.upsert(f as any);
  }
  console.log(`Seeded ${defs.length} features`);
}

seedFeatures().then(() => sequelize.close());