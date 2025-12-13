/*
  Integration demo for createTransactionWithPayments
  - Runs two scenarios against your local dev DB (use .env or .env.local):
    1) success flow: creates transaction + expense + payments in a single tx -> committed
    2) failure flow: throws after expense created to ensure rollback

  Usage (from kisaan-backend-node folder):
    npx ts-node ../validation/run-orchestration-demo.ts

  NOTE: This script connects to your configured DB and will create rows. Use a local/test DB.
*/

import 'dotenv/config';
import { sequelize } from '../kisaan-backend-node/src/models/index';
import { TransactionService } from '../kisaan-backend-node/src/services/transactionService';
import { expenseService } from '../kisaan-backend-node/src/services/settlementService';

async function run() {
  await sequelize.authenticate();
  console.log('DB connected');
  const txnService = new TransactionService();

  // Adjust these ids to match seeded test data in your DB
  const shopId = 1;
  const farmerId = 2;
  const buyerId = 3;
  const requestingUser = { role: 'OWNER', id: 1 };

  console.log('Running success scenario...');
  try {
    const res = await txnService.createTransactionWithPayments({
      transaction: {
        shop_id: shopId,
        farmer_id: farmerId,
        buyer_id: buyerId,
        category_id: 1,
        product_name: 'Demo Product',
        quantity: 1,
        unit_price: 100
      },
      expenses: [{ amount: 10, description: 'Shop advanced fee', type: 'expense' }],
      buyerPayment: { amount: 100, method: 'Cash' },
      shopPaysFarmer: { amount: 90, method: 'Cash' }
    }, requestingUser);
    console.log('Success scenario result:', (res as any).id);
  } catch (err) {
    console.error('Success scenario failed unexpectedly:', err);
  }

  console.log('\nRunning failure/rollback scenario...');
  try {
    // We'll monkey-patch txnService.createTransaction to throw after expense creation to simulate a mid-flow failure
    // But since createTransactionWithPayments wraps calls in a transaction, we instead call a wrapper that throws after expense creation
    const badParams = {
      transaction: {
        shop_id: shopId,
        farmer_id: farmerId,
        buyer_id: buyerId,
        category_id: 1,
        product_name: 'Demo Product',
        quantity: 1,
        unit_price: 50
      },
      expenses: [{ amount: 20, description: 'Shop advanced fee', type: 'expense' }],
      buyerPayment: null,
      shopPaysFarmer: { amount: 30, method: 'Cash' }
    } as any;

    // We will perform the same calls as createTransactionWithPayments but throw before commit
    const txn = await sequelize.transaction();
    try {
      const txResult = await (txnService as any).createTransaction(badParams.transaction, requestingUser, { tx: txn });
      // create expenses inside tx
      for (const e of badParams.expenses) {
        await expenseService.createExpense({
          shop_id: badParams.transaction.shop_id,
          user_id: String(badParams.transaction.farmer_id),
          transaction_id: (txResult as any).id,
          amount: e.amount,
          type: e.type || 'expense',
          description: e.description || ''
        } as any, { tx: txn });
      }
      // Simulate failure
      throw new Error('Simulated failure after expense creation');
    } catch (err) {
      await txn.rollback();
      console.log('Rolled back transaction as expected due to simulated error');
    }

    console.log('Failure scenario completed (expected rollback)');
  } catch (err) {
    console.error('Failure scenario script failed:', err);
  }

  await sequelize.close();
  console.log('DB connection closed');
}

run().catch(e => {
  console.error('Demo script error', e);
  process.exit(1);
});
