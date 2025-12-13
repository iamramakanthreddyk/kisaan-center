import { sequelize, Payment, PaymentAllocation, Transaction } from '../src/models';

(async () => {
  try {
    await sequelize.authenticate();

    console.log('\n=== Latest payments for shop_id=1 ===');
    const payments = await Payment.findAll({ where: { shop_id: 1 }, order: [['created_at', 'DESC']], limit: 50 });
    console.log(payments.map(p => ({ id: p.id, transaction_id: p.transaction_id, payer_type: p.payer_type, payee_type: p.payee_type, amount: p.amount, status: p.status, counterparty_id: p.counterparty_id, shop_id: p.shop_id, created_at: p.created_at })));

    console.log('\n=== Latest payment allocations ===');
    const allocs = await PaymentAllocation.findAll({ order: [['created_at', 'DESC']], limit: 200 });
    console.log(allocs.map(a => ({ id: a.id, payment_id: a.payment_id, transaction_id: a.transaction_id, allocated_amount: a.allocated_amount, created_at: a.created_at })));

    console.log('\n=== Latest transactions for shop_id=1 ===');
    const txns = await Transaction.findAll({ where: { shop_id: 1 }, order: [['created_at', 'DESC']], limit: 50 });
    console.log(txns.map(t => ({ id: t.id, total_amount: t.total_amount, farmer_earning: t.farmer_earning, commission_amount: t.commission_amount, created_at: t.created_at })));

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error running inspection script', err);
    try { await sequelize.close(); } catch(_) {}
    process.exit(2);
  }
})();
