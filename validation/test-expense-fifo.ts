import 'dotenv/config';
import { sequelize } from '../kisaan-backend-node/src/models/index';
import Expense from '../kisaan-backend-node/src/models/expense';
import { ExpenseRepository } from '../kisaan-backend-node/src/repositories/ExpenseRepository';
import { PaymentService } from '../kisaan-backend-node/src/services/paymentService';
import { User } from '../kisaan-backend-node/src/models/user';
import { Shop } from '../kisaan-backend-node/src/models/shop';

async function findOrCreateTestEntities(tx: any) {
  // Prefer existing seeded test entities. Creating minimal entities here is fragile because
  // model creation requires several required fields and enums. If not present, fail fast and
  // instruct the user to seed the DB (db:bootstrap:local).
  const farmer = await User.findOne({ where: { role: 'FARMER' }, transaction: tx });
  if (!farmer) throw new Error('No FARMER user found in DB. Please seed test data before running this script.');
  const shopId = (farmer as any).shop_id as number | undefined | null;
  if (!shopId) throw new Error('Found FARMER but farmer.shop_id is not set. Please seed test data before running this script.');
  const shop = await Shop.findOne({ where: { id: shopId }, transaction: tx } as any);
  if (!shop) throw new Error('No shop found for the FARMER user. Please seed test data before running this script.');
  return { farmer, shop };
}

async function run() {
  console.log('Starting expense FIFO test (running inside a transaction, will rollback at end)');
  const tx = await sequelize.transaction();
  try {
    const { farmer, shop } = await findOrCreateTestEntities(tx as any);
    const expenseRepo = new ExpenseRepository();

    // create two expenses: oldExpense (10), newExpense (5)
    const old = await expenseRepo.create({ shop_id: shop.id, user_id: farmer.id, amount: 10, type: 'expense', description: 'old', status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24) } as any, { tx });
    const neu = await expenseRepo.create({ shop_id: shop.id, user_id: farmer.id, amount: 5, type: 'expense', description: 'new', status: 'pending' } as any, { tx });

    const paymentService = new PaymentService();

    // Pay 12: should fully settle old (10) and partially settle new (2), leaving new.amount = 3
    await paymentService.createPayment({ payer_type: 'SHOP', payee_type: 'FARMER', amount: 12, counterparty_id: farmer.id, shop_id: shop.id, method: 'CASH', payment_date: new Date() } as any, 0, { tx });

    const pending = await expenseRepo.findPendingByUser(shop.id, farmer.id, { tx });
    if (!Array.isArray(pending)) throw new Error('Expected pending list');
    // pending should contain one item (the partially-settled new expense) with amount 3
    if (pending.length !== 1) {
      throw new Error(`Expected 1 pending expense after payment, got ${pending.length}`);
    }
    const remaining = Number((pending[0] as any).amount);
    if (Math.abs(remaining - 3) > 0.001) {
      throw new Error(`Expected remaining amount 3, got ${remaining}`);
    }

    console.log('FIFO expense test passed');
    await tx.rollback();
    console.log('Rolled back test transaction');
  } catch (err) {
    await tx.rollback();
    console.error('Test failed:', err);
    process.exitCode = 2;
  } finally {
    await sequelize.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
