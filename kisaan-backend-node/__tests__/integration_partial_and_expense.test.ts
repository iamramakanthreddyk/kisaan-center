import { User, UserRole } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { Transaction } from '../src/models/transaction';
import { PaymentService } from '../src/services/paymentService';
import { ExpenseRepository } from '../src/repositories/ExpenseRepository';
import * as expenseService from '../src/services/expenseService';
import sequelize from '../src/config/database';

// Integration tests that exercise partial payments, later settlement, and expense flows.
// These tests expect a reachable Postgres test DB configured via .env (NODE_ENV=test optional).

jest.setTimeout(30000);

const RUN_INTEGRATION = process.env.USE_TEST_DB === '1';

(RUN_INTEGRATION ? describe : describe.skip)('integration: partial payments, settlement, expenses', () => {
  let owner: User | null = null;
  let shop: Shop | null = null;
  let farmer: User | null = null;
  let buyer: User | null = null;
  let txn: Transaction | null = null;
  const createdIds: { users: number[]; shops: number[]; transactions: number[]; payments: number[]; expenses: number[] } = { users: [], shops: [], transactions: [], payments: [], expenses: [] };

  let tx: import('sequelize').Transaction | null = null;
  beforeAll(async () => {
    if (!RUN_INTEGRATION) return;
    // Ensure DB connection
    await sequelize.authenticate();
    tx = await sequelize.transaction();
  });

  afterAll(async () => {
    if (!RUN_INTEGRATION) return;
    // Rollback the transaction so no test data persists
    try {
      if (tx) await tx.rollback();
    } catch (err) {
      console.warn('rollback warning', err);
    }
    await sequelize.close();
  });

  test('expense creation should NOT increase farmer balance (fixes double-counting bug)', async () => {
    // Create a separate farmer for this test to avoid interference
    const testFarmer = await User.create({
      username: `farmer_balance_test_${Date.now()}`,
      password: 'p',
      role: UserRole.Farmer,
      shop_id: shop!.id,
      balance: 1000, // Start with positive balance (earnings)
      cumulative_value: 0
    } as any, { transaction: tx as any });
    createdIds.users.push(testFarmer.id as number);

    const farmerBalanceBefore = Number(testFarmer.balance || 0);

    // Create an expense using the service (not repository) to test the fix
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: testFarmer.id,
      amount: 300,
      type: 'transport',
      description: 'Balance test expense'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Fetch farmer balance after expense creation
    const farmerAfter = await User.findByPk(testFarmer.id, { transaction: tx as any });
    const farmerBalanceAfter = Number(farmerAfter!.balance || 0);

    // Balance should NOT have increased (fixes double-counting bug)
    expect(farmerBalanceAfter).toBe(farmerBalanceBefore);
  }, 20000);

  test('manual expense settlement should increase farmer balance (fixes missing balance updates)', async () => {
    // Create a separate farmer for this test
    const testFarmer = await User.create({
      username: `farmer_settlement_test_${Date.now()}`,
      password: 'p',
      role: UserRole.Farmer,
      shop_id: shop!.id,
      balance: 500, // Start with some earnings
      cumulative_value: 0
    } as any, { transaction: tx as any });
    createdIds.users.push(testFarmer.id as number);

    const farmerBalanceBefore = Number(testFarmer.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: testFarmer.id,
      amount: 200,
      type: 'equipment',
      description: 'Settlement test expense'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Manually settle the full expense
    const settlement = await expenseService.settleExpense(expense.id, { tx: tx as any });

    // Farmer balance should increase by the settled amount (debt reduction)
    const farmerAfter = await User.findByPk(testFarmer.id, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 200;
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);
  }, 20000);

  test('partial expense settlement should increase farmer balance proportionally', async () => {
    // Create a separate farmer for this test
    const testFarmer = await User.create({
      username: `farmer_partial_test_${Date.now()}`,
      password: 'p',
      role: UserRole.Farmer,
      shop_id: shop!.id,
      balance: 300,
      cumulative_value: 0
    } as any, { transaction: tx as any });
    createdIds.users.push(testFarmer.id as number);

    const farmerBalanceBefore = Number(testFarmer.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: testFarmer.id,
      amount: 400,
      type: 'maintenance',
      description: 'Partial settlement test expense'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Settle partial amount (150 out of 400)
    const settlement = await expenseService.settleExpenseAmount(expense.id, 150, undefined, { tx: tx as any });

    // Farmer balance should increase by the settled amount
    const farmerAfter = await User.findByPk(testFarmer.id, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 150;
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);
  }, 20000);

  test('partial buyer payment realizes proportional commission; later payment completes allocation', async () => {
    // Create owner, shop, farmer, buyer
  owner = await User.create({ username: `owner_test_${Date.now()}`, password: 'p', role: UserRole.Owner, balance: 0, cumulative_value: 0 } as any, { transaction: tx as any });
  createdIds.users.push(owner.id as number);
  shop = await Shop.create({ name: `testshop_${Date.now()}`, owner_id: owner.id, address: null, contact: null, status: 'active' } as any, { transaction: tx as any });
  createdIds.shops.push(shop.id as number);
  farmer = await User.create({ username: `farmer_test_${Date.now()}`, password: 'p', role: UserRole.Farmer, shop_id: shop.id, balance: 0, cumulative_value: 0 } as any, { transaction: tx as any });
  createdIds.users.push(farmer.id as number);
  buyer = await User.create({ username: `buyer_test_${Date.now()}`, password: 'p', role: UserRole.Buyer, shop_id: shop.id, balance: 0, cumulative_value: 0 } as any, { transaction: tx as any });
  createdIds.users.push(buyer.id as number);

    // Create a transaction: total 1000, commission 50 (5%)
  txn = await Transaction.create({ shop_id: shop.id, buyer_id: buyer.id, farmer_id: farmer.id, total_amount: 1000, quantity: 10, unit_price: 100, commission_rate: 5, commission_amount: 50, farmer_earning: 950 } as any, { transaction: tx as any });
  createdIds.transactions.push(txn.id as number);

    const paymentSvc = new PaymentService();

    // 1) Buyer makes partial payment of 300 referencing the transaction
    const paymentDto1: any = {
      amount: 300,
      payer_type: 'BUYER',
      payee_type: 'SHOP',
      counterparty_id: buyer.id,
      transaction_id: txn.id,
      shop_id: shop.id,
      status: 'PAID',
      payment_date: new Date().toISOString(),
      method: 'Cash'
    };

  const p1 = await paymentSvc.createPayment(paymentDto1, buyer!.id as number, { tx: tx as any });
  if (p1 && (p1 as any).id) createdIds.payments.push(Number((p1 as any).id));

    // Fetch owner cumulative_value
  const ownerAfter1 = await User.findByPk(owner!.id!, { transaction: tx as any });
    expect(ownerAfter1).not.toBeNull();
    // commission share = 300/1000 * 50 = 15
    expect(Number(ownerAfter1!.cumulative_value)).toBeCloseTo(15, 2);

    // 2) Buyer makes another payment of 700 to complete the transaction
    const paymentDto2: any = {
      amount: 700,
      payer_type: 'BUYER',
      payee_type: 'SHOP',
      counterparty_id: buyer.id,
      transaction_id: txn.id,
      shop_id: shop.id,
      status: 'PAID',
      payment_date: new Date().toISOString(),
      method: 'Cash'
    };

  const p2 = await paymentSvc.createPayment(paymentDto2, buyer!.id as number, { tx: tx as any });
  if (p2 && (p2 as any).id) createdIds.payments.push(Number((p2 as any).id));

  const ownerAfter2 = await User.findByPk(owner!.id!, { transaction: tx as any });
    // total commission realized = 50; owner cumulative should be approx 15 + 35 = 50
    expect(Number(ownerAfter2!.cumulative_value)).toBeCloseTo(50, 2);
  }, 20000);

  test('expense creation and settlement via shop payment applies FIFO and updates farmer balance', async () => {
    // create an expense for farmer
    const expenseRepo = new ExpenseRepository();
  const expense = await expenseRepo.create({ shop_id: shop!.id, user_id: farmer!.id, amount: 500, type: 'advance', description: 'integration test expense' } as any, { tx: tx as any });
  if (expense && (expense as any).id) createdIds.expenses.push(Number((expense as any).id));

    // Farmer balance before expense creation and settlement
  const farmerBefore = await User.findByPk(farmer!.id!, { transaction: tx as any });
    expect(farmerBefore).not.toBeNull();
    const farmerBalBefore = Number(farmerBefore!.balance || 0);

    // Shop pays farmer (SHOP -> FARMER) to settle expenses using PaymentService
    const paymentSvc = new PaymentService();
    const payDto: any = {
      amount: 500,
      payer_type: 'SHOP',
      payee_type: 'FARMER',
  counterparty_id: farmer!.id,
      transaction_id: null,
  shop_id: shop!.id,
      status: 'PAID',
      payment_date: new Date().toISOString(),
      method: 'Cash'
    };

  const resp = await paymentSvc.createPayment(payDto, owner!.id as number, { tx: tx as any });

  const farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const farmerBalAfter = Number(farmerAfter!.balance || 0);

    // farmer balance should INCREASE (debt reduction) by close to 500 after FIFO settlement
    // This validates that expense settlement properly updates farmer balance
    expect(farmerBalAfter).toBeCloseTo(farmerBalBefore + 500, 1);
  }, 20000);
});
