const { sequelize } = require('../dist/src/models/index');
const SHOP_ID = 1;

async function run() {
  try {
    console.log('Computing pending_to_farmer for shop', SHOP_ID);
    const [rows] = await sequelize.query(`
      SELECT t.id, t.farmer_id, t.total_amount, t.farmer_earning,
        COALESCE(p.paid,0) as paid_to_farmer,
        (t.farmer_earning - COALESCE(p.paid,0)) as pending
      FROM kisaan_transactions t
      LEFT JOIN (
        SELECT transaction_id, SUM(amount) as paid
        FROM kisaan_payments
        WHERE payer_type = 'SHOP' AND payee_type = 'FARMER' AND status = 'PAID'
        GROUP BY transaction_id
      ) p ON t.id = p.transaction_id
      WHERE t.shop_id = ?
      ORDER BY pending DESC
    `, { replacements: [SHOP_ID] });

    let totalPending = 0;
    for (const r of rows) {
      const pending = Number(r.pending || 0);
      if (pending > 0) {
        totalPending += pending;
        console.log(`txn ${r.id}: farmer_id=${r.farmer_id} farmer_earning=${Number(r.farmer_earning).toFixed(2)} paid=${Number(r.paid_to_farmer || r.paid || 0).toFixed(2)} pending=${pending.toFixed(2)}`);
      }
    }
    console.log('TOTAL pending_to_farmer:', totalPending.toFixed(2));
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 2;
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

if (require.main === module) run();
