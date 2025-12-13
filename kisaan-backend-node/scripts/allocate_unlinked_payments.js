/*
Idempotent allocation script
- Dry-run by default: reports how unlinked SHOP->FARMER paid payments would be applied to pending transactions
- Use --apply to actually perform updates (update payment.transaction_id and create a small allocation audit)
- Usage: node scripts/allocate_unlinked_payments.js --shop_id=1 [--apply]
*/

const argv = require('minimist')(process.argv.slice(2));
const shopId = argv.shop_id || argv.shopId || argv.shop || argv.s;
const APPLY = !!argv.apply;

if (!shopId) {
  console.error('Usage: node scripts/allocate_unlinked_payments.js --shop_id=1 [--apply]');
  process.exit(2);
}

(async function main() {
  try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sequelize } = require('../dist/src/models/index');

    // 1) fetch unlinked shop->farmer paid payments for the shop, ordered by created_at asc (oldest first)
    const [unlinked] = await sequelize.query(
      `SELECT id, amount, counterparty_id as farmer_id, created_at FROM kisaan_payments
       WHERE payer_type = 'SHOP' AND payee_type = 'FARMER' AND status = 'PAID' AND transaction_id IS NULL AND shop_id = ?
       ORDER BY created_at ASC`,
      { replacements: [shopId] }
    );

    // 2) fetch pending transactions (farmer_earning - paid_to_farmer) > 0, ordered oldest first
    const [pendingTxns] = await sequelize.query(
      `SELECT t.id, t.farmer_id, t.farmer_earning, COALESCE(p.paid,0) as paid_to_farmer, GREATEST(t.farmer_earning - COALESCE(p.paid,0),0) as pending, t.created_at
       FROM kisaan_transactions t
       LEFT JOIN (
         SELECT transaction_id, SUM(amount) as paid
         FROM kisaan_payments
         WHERE payer_type = 'SHOP' AND payee_type = 'FARMER' AND status = 'PAID'
         GROUP BY transaction_id
       ) p ON t.id = p.transaction_id
       WHERE t.shop_id = ? AND GREATEST(t.farmer_earning - COALESCE(p.paid,0),0) > 0
       ORDER BY t.created_at ASC`,
      { replacements: [shopId] }
    );

    if ((!unlinked || unlinked.length === 0) && (!pendingTxns || pendingTxns.length === 0)) {
      console.log('Nothing to allocate: no unlinked payments or no pending transactions for shop', shopId);
      process.exit(0);
    }

    console.log(`Found ${unlinked.length} unlinked shop->farmer payments and ${pendingTxns.length} pending transactions for shop ${shopId}`);

    // Make mutable copies
    const unlinkedList = Array.isArray(unlinked) ? unlinked.map(u => ({ ...u, amount: Number(u.amount) })) : [];
    const pendingList = Array.isArray(pendingTxns) ? pendingTxns.map(t => ({ ...t, pending: Number(t.pending) })) : [];

    const allocations = [];

    for (const payment of unlinkedList) {
      let remaining = payment.amount;
      if (remaining <= 0) continue;
      for (const txn of pendingList) {
        if (txn.pending <= 0) continue;
        const amountToApply = Math.min(remaining, txn.pending);
        if (amountToApply <= 0) continue;
        allocations.push({ payment_id: payment.id, transaction_id: txn.id, amount: amountToApply });
        remaining -= amountToApply;
        txn.pending -= amountToApply;
        if (remaining <= 0) break;
      }
      // If remaining > 0, it stays as unapplied/unallocated (prepayment)
      if (remaining > 0) {
        allocations.push({ payment_id: payment.id, transaction_id: null, amount: payment.amount - remaining, note: 'partial allocation, remaining unapplied amount: ' + remaining });
      }
    }

    if (allocations.length === 0) {
      console.log('No allocations computed (either no pending balance or unlinked payments are zero)');
      process.exit(0);
    }

    console.log('Planned allocations (dry-run):');
    for (const a of allocations) {
      console.log(a);
    }

    if (!APPLY) {
      console.log('\nDry-run complete. Run with --apply to perform updates.');
      process.exit(0);
    }

    // APPLY allocations in a transaction: insert into kisaan_payment_allocations and optionally update kisaan_payments.allocated_amount
    await sequelize.transaction(async (tx) => {
      // detect if allocated_amount column exists on kisaan_payments
      const [colInfo] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'kisaan_payments' AND column_name = 'allocated_amount'`
      );
      const hasAllocatedAmount = Array.isArray(colInfo) && colInfo.length > 0;

      for (const a of allocations) {
        if (!a.transaction_id) continue; // nothing to update for allocations without a tx
        // idempotency: check if an identical allocation already exists
        const [exists] = await sequelize.query(
          `SELECT 1 FROM kisaan_payment_allocations WHERE payment_id = ? AND transaction_id = ? AND allocated_amount = ? LIMIT 1`,
          { replacements: [a.payment_id, a.transaction_id, a.amount], transaction: tx }
        );
        const already = Array.isArray(exists) && exists.length > 0;
        if (already) {
          console.log('Skipping existing allocation', a);
          continue;
        }

        // insert allocation
        await sequelize.query(
          `INSERT INTO kisaan_payment_allocations(payment_id, transaction_id, allocated_amount, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
          { replacements: [a.payment_id, a.transaction_id, a.amount], transaction: tx }
        );

        // update allocated_amount on payment if column exists
        if (hasAllocatedAmount) {
          await sequelize.query(
            `UPDATE kisaan_payments SET allocated_amount = COALESCE(allocated_amount,0) + :amt WHERE id = :pid`,
            { replacements: { amt: a.amount, pid: a.payment_id }, transaction: tx }
          );
        }

        console.log('Inserted allocation for payment', a.payment_id, '-> txn', a.transaction_id, 'amount', a.amount);
      }
    });

    console.log('Allocations applied successfully');
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 2;
  }
})();
