import sequelize from '../src/config/database';
import { User, UserRole } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { Transaction } from '../src/models/transaction';
import { PaymentService } from '../src/services/paymentService';

// Simple integration-style test: create owner, shop, transaction, create payment allocated to transaction,
// ensure owner's cumulative_value increments by expected commission share.

describe('commission realization', () => {
  beforeAll(async () => {
    // ensure DB is ready
    await sequelize.sync({ force: true });
  }, 20000);

  afterAll(async () => {
    await sequelize.close();
  });

  test('owner cumulative_value increments on direct payment allocation', async () => {
    // Create owner and shop
    const owner = await User.create({ username: 'owner1', password: 'p', role: UserRole.Owner, balance: 0, cumulative_value: 0 } as any);
    const shop = await Shop.create({ name: 's1', owner_id: owner.id, address: null, contact: null, status: 'active' } as any);

    // Create a transaction with total 1000 and commission 50 (5%)
    const txn = await Transaction.create({ shop_id: shop.id, buyer_id: 9999, farmer_id: 9998, total_amount: 1000, quantity: 10, unit_price: 100, commission_rate: 5, commission_amount: 50, farmer_earning: 950 } as any);

    const paymentService = new PaymentService();

    // Create payment allocated to transaction (buyer->shop) via public createPayment API
    const paymentDto: any = {
      amount: 200,
      payer_type: 'BUYER',
      payee_type: 'SHOP',
      counterparty_id: 9999,
      transaction_id: txn.id,
      shop_id: shop.id,
      status: 'PAID',
      payment_date: new Date().toISOString(),
      method: 'Cash'
    };

    await paymentService.createPayment(paymentDto, owner.id as number);

    const refreshedOwner = await User.findByPk(owner.id);
    expect(refreshedOwner).not.toBeNull();
    // allocation 200 on total 1000 -> 20% of commission realized => 0.2 * 50 = 10
    expect(Number(refreshedOwner!.cumulative_value)).toBeCloseTo(10, 2);
  }, 20000);
});
