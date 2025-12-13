import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { OwnerDashboardService } from '../src/services/ownerDashboardService';

async function run() {
  const svc = new OwnerDashboardService();
  const ownerId = 2; // found in DB for username ramakanthreddy_0_107
  console.log(`Calling getOwnerDashboardStats for ownerId=${ownerId} (test owner)`);
  const res = await svc.getOwnerDashboardStats(ownerId);
  console.log('Result:', JSON.stringify(res, null, 2));
}

run().catch(e => { console.error('directDashboardCall failed', e); process.exit(1); });
