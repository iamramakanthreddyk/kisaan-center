import { sequelize } from '../src/models';
import { User } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { UserRole } from '../src/models/user';
import { TransactionLedger } from '../src/models/transactionLedger';
import { PaymentService } from '../src/services/paymentService';

jest.setTimeout(20000);

const RUN_INTEGRATION = process.env.USE_TEST_DB === '1';

(RUN_INTEGRATION ? describe : describe.skip)('Shop -> Farmer standalone payment', () => {
  let tx: any;
  beforeAll(async () => {
    // start a transaction so test DB changes can be rolled back
    tx = await sequelize.transaction();
  });

  afterAll(async () => {
    if (tx) await tx.rollback();
  });

  test('owner payment reduces farmer negative balance and creates ledger delta', async () => {
    // Create shop and farmer
  const shop = await Shop.create({ name: 'Test Shop For Payment', owner_id: 1, status: 'active', address: null, contact: null, email: null }, { transaction: tx } as any);
  if (!shop || !shop.id) throw new Error('Failed to create shop for test');

  const farmer = await User.create({ username: `test_farmer_${Date.now()}`, password: 'testpass', role: UserRole.Farmer, shop_id: shop.id, balance: -179579.8 }, { transaction: tx } as any);
  if (!farmer || !farmer.id) throw new Error('Failed to create farmer for test');

    const paymentSvc = new PaymentService();

    const paymentDto: any = {
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      amount: 100000, // owner pays 100k toward farmer
      method: 'CASH',
      shop_id: shop.id,
      counterparty_id: farmer.id,
      payment_date: new Date()
    };

    // Create payment within the same test transaction
    const result = await paymentSvc.createPayment(paymentDto, 1, { tx });

    // Reload farmer and ledger
    const refreshedFarmer = await User.findByPk(farmer.id, { transaction: tx });
    const ledger = await TransactionLedger.findOne({ where: { user_id: farmer.id }, order: [['created_at','DESC']], transaction: tx as any });

    expect(refreshedFarmer).toBeDefined();
    // Farmer balance should increase (be less negative)
    expect(Number(refreshedFarmer!.balance)).toBeGreaterThan(-179579.8);

    // Ledger should exist and delta should equal the balance change (within cents)
    if (ledger) {
      const delta = Number(ledger.delta_amount || 0);
      const balanceBefore = Number(ledger.balance_before || 0);
      const balanceAfter = Number(ledger.balance_after || 0);
      expect(Math.abs((balanceAfter - balanceBefore) - delta)).toBeLessThan(0.01);
    } else {
      throw new Error('Expected a ledger row for the standalone payment');
    }
  });
});
