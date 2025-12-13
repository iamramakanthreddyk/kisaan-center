import { User, UserRole } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { PaymentService } from '../src/services/paymentService';
import { ExpenseRepository } from '../src/repositories/ExpenseRepository';
import { ExpenseSettlement } from '../src/models/expenseSettlement';
import * as expenseService from '../src/services/expenseService';
import * as settlementService from '../src/services/settlementService';
import sequelize from '../src/config/database';

// Comprehensive tests for balance calculation fixes
// These tests validate the fixes for:
// 1. Double balance counting in expense creation
// 2. Missing balance updates on expense settlement
// 3. Inconsistent settlement logic

jest.setTimeout(30000);

const RUN_INTEGRATION = process.env.USE_TEST_DB === '1';

(RUN_INTEGRATION ? describe : describe.skip)('Balance Calculation Fixes', () => {
  let owner: User | null = null;
  let shop: Shop | null = null;
  let farmer: User | null = null;
  const createdIds: { users: number[]; shops: number[]; expenses: number[]; settlements: number[] } = {
    users: [], shops: [], expenses: [], settlements: []
  };

  let tx: import('sequelize').Transaction | null = null;

  beforeAll(async () => {
    if (!RUN_INTEGRATION) return;
    await sequelize.authenticate();
    tx = await sequelize.transaction();
  });

  afterAll(async () => {
    if (!RUN_INTEGRATION) return;
    try {
      if (tx) await tx.rollback();
    } catch (err) {
      console.warn('rollback warning', err);
    }
    await sequelize.close();
  });

  beforeEach(async () => {
    if (!RUN_INTEGRATION) return;

    // Create test entities for each test
    owner = await User.create({
      username: `owner_balance_test_${Date.now()}_${Math.random()}`,
      password: 'p',
      role: UserRole.Owner,
      balance: 0,
      cumulative_value: 0
    } as any, { transaction: tx as any });
    createdIds.users.push(owner.id as number);

    shop = await Shop.create({
      name: `testshop_balance_${Date.now()}_${Math.random()}`,
      owner_id: owner.id,
      address: null,
      contact: null,
      status: 'active'
    } as any, { transaction: tx as any });
    createdIds.shops.push(shop.id as number);

    farmer = await User.create({
      username: `farmer_balance_test_${Date.now()}_${Math.random()}`,
      password: 'p',
      role: UserRole.Farmer,
      shop_id: shop.id,
      balance: 1000, // Start with positive balance (earnings)
      cumulative_value: 0
    } as any, { transaction: tx as any });
    createdIds.users.push(farmer.id as number);
  });

  test('expense creation should NOT increase farmer balance (fixes double-counting bug)', async () => {
    const farmerBalanceBefore = Number(farmer!.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 500,
      type: 'advance',
      description: 'Test expense for balance check'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Fetch farmer balance after expense creation
    const farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const farmerBalanceAfter = Number(farmerAfter!.balance || 0);

    // Balance should NOT have increased (no double-counting)
    // The balance recalculation logic will handle the deduction automatically
    expect(farmerBalanceAfter).toBe(farmerBalanceBefore);

    // Verify expense was created
    expect(expense.id).toBeDefined();
    expect(expense.amount).toBe(500);
  });

  test('full expense settlement should increase farmer balance correctly', async () => {
    const farmerBalanceBefore = Number(farmer!.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 300,
      type: 'transport',
      description: 'Test expense for full settlement'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Farmer balance should still be the same (no increase on creation)
    let farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    expect(Number(farmerAfter!.balance || 0)).toBe(farmerBalanceBefore);

    // Settle the full expense
    const settledExpense = await expenseService.settleExpense(expense.id, { tx: tx as any });

    // Farmer balance should increase by the settled amount (debt reduction)
    farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 300; // Balance increases when debt is settled
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);

    // Verify expense was marked as settled
    expect(settledExpense.status).toBe('settled');
  });

  test('partial expense settlement should increase farmer balance proportionally', async () => {
    const farmerBalanceBefore = Number(farmer!.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 500,
      type: 'equipment',
      description: 'Test expense for partial settlement'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Settle partial amount (200 out of 500)
    const settledExpense = await expenseService.settleExpenseAmount(
      expense.id,
      200,
      undefined, // no payment_id
      { tx: tx as any }
    );

    // Farmer balance should increase by the settled amount
    const farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 200;
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);

    // Verify expense still has unsettled amount (should still be pending)
    expect(settledExpense.status).toBe('pending'); // Partial settlement keeps it pending
  });

  test('payment-triggered expense settlement should update balances correctly via FIFO', async () => {
    const farmerBalanceBefore = Number(farmer!.balance || 0);

    // Create two expenses (FIFO order)
    const expense1 = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 200,
      type: 'transport',
      description: 'First expense for FIFO test'
    }, { tx: tx as any });

    const expense2 = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 300,
      type: 'equipment',
      description: 'Second expense for FIFO test'
    }, { tx: tx as any });

    createdIds.expenses.push(expense1.id, expense2.id);

    // Farmer balance should still be the same
    let farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    expect(Number(farmerAfter!.balance || 0)).toBe(farmerBalanceBefore);

    // Create a shop-to-farmer payment that should trigger expense settlement
    const paymentService = new PaymentService();
    const paymentDto: any = {
      amount: 350, // Enough to settle first expense fully (200) and partial second (150)
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      counterparty_id: farmer!.id,
      transaction_id: null,
      shop_id: shop!.id,
      status: 'PAID',
      payment_date: new Date().toISOString(),
      method: 'Cash'
    };

    const payment = await paymentService.createPayment(paymentDto, owner!.id as number, { tx: tx as any });

    // Farmer balance should increase by the amount that settled expenses (350)
    farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 350;
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);

    // Verify settlements were created via FIFO
    const settlements = await ExpenseSettlement.findAll({
      where: { expense_id: [expense1.id, expense2.id] },
      transaction: tx as any
    });

    expect(settlements.length).toBeGreaterThanOrEqual(2); // At least two settlements

    // First expense should be fully settled (200)
    const expense1Settlements = settlements.filter(s => s.expense_id === expense1.id);
    const expense1TotalSettled = expense1Settlements.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    expect(expense1TotalSettled).toBe(200);

    // Second expense should be partially settled (150)
    const expense2Settlements = settlements.filter(s => s.expense_id === expense2.id);
    const expense2TotalSettled = expense2Settlements.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    expect(expense2TotalSettled).toBe(150);
  });

  test('settlement service should use expense service methods for consistent balance updates', async () => {
    const farmerBalanceBefore = Number(farmer!.balance || 0);

    // Create an expense
    const expense = await expenseService.createExpense({
      shop_id: shop!.id,
      user_id: farmer!.id,
      amount: 400,
      type: 'maintenance',
      description: 'Test expense for settlement service'
    }, { tx: tx as any });

    createdIds.expenses.push(expense.id);

    // Use settlement service to apply repayment (simulating payment processing)
    const result = await settlementService.applyRepaymentFIFO(
      shop!.id!,
      farmer!.id!,
      250, // Partial repayment
      undefined, // no payment_id
      { tx: tx as any }
    );

    // Should have created settlements
    expect(result.settlements.length).toBeGreaterThan(0);

    // Farmer balance should increase by settled amount
    const farmerAfter = await User.findByPk(farmer!.id!, { transaction: tx as any });
    const expectedBalance = farmerBalanceBefore + 250;
    expect(Number(farmerAfter!.balance || 0)).toBeCloseTo(expectedBalance, 2);

    // Verify settlements are recorded
    const totalSettled = result.settlements.reduce((sum: number, s: any) => sum + Number(s.settledAmount), 0);
    expect(totalSettled).toBe(250);
  });
});