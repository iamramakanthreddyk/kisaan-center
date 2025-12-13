/**
 * Ledger Reconciliation Script
 * Compares user.balance with sum of ledger deltas to flag drift.
 * Usage (ts-node):  npx ts-node scripts/ledger_reconciliation.ts
 */
import sequelize from '../kisaan-backend-node/src/config/database';

interface DriftRow { user_id: number; role: string | null; balance: number; ledger_sum: number; diff: number; }

async function run() {
  try {
    const [rows] = await sequelize.query(`
      WITH ledger_sums AS (
        SELECT user_id, COALESCE(SUM(delta_amount),0) AS ledger_sum
        FROM kisaan_transaction_ledger
        GROUP BY user_id
      )
      SELECT u.id as user_id, u.role, u.balance::numeric(14,2) as balance,
             COALESCE(l.ledger_sum,0)::numeric(14,2) as ledger_sum,
             (u.balance - COALESCE(l.ledger_sum,0))::numeric(14,2) as diff
      FROM kisaan_users u
      LEFT JOIN ledger_sums l ON l.user_id = u.id
      ORDER BY ABS(u.balance - COALESCE(l.ledger_sum,0)) DESC, u.id
    `);

    const drift = (rows as any[]).filter(r => Number(r.diff) !== 0);
    console.log(`Total users: ${(rows as any[]).length}`);
    console.log(`Users with drift: ${drift.length}`);
    console.table(drift.slice(0, 25));

    const totalLedger = (rows as any[]).reduce((s, r) => s + Number(r.ledger_sum), 0);
    const totalBalance = (rows as any[]).reduce((s, r) => s + Number(r.balance), 0);
    console.log(`Global Totals -> balance: ${totalBalance.toFixed(2)} | ledger_sum: ${totalLedger.toFixed(2)} | diff: ${(totalBalance - totalLedger).toFixed(2)}`);

    if (drift.length) {
      console.log('Recommendation: Run targeted rebuild for affected users or inspect recent transactions for missing ledger entries.');
    } else {
      console.log('No drift detected.');
    }
    process.exit(0);
  } catch (e) {
    console.error('Reconciliation failed', e);
    process.exit(1);
  }
}

run();
