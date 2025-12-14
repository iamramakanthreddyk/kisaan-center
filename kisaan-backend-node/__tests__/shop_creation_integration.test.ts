import sequelize from '../src/config/database';
import { User, UserRole } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { ShopService } from '../src/services/shopService';

jest.setTimeout(20000);

const RUN_INTEGRATION = process.env.USE_TEST_DB === '1';

(RUN_INTEGRATION ? describe : describe.skip)('integration: shop creation binds owner', () => {
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

  test('creates shop and links owner atomically', async () => {
    // Create an owner user with role OWNER and no shop_id
    const owner = await User.create({
      username: `owner_it_${Date.now()}`,
      password: 'p',
      role: UserRole.Owner,
      balance: 0,
      cumulative_value: 0,
    } as any, { transaction: tx as any });

    const shopService = new ShopService();

    // Create shop using service; this should update owner's shop_id as part of a transaction
    const shop = await shopService.createShop({
      name: `it-shop-${Date.now()}`,
      owner_id: owner.id,
      location: 'Test Location',
      category_id: 1,
    }, { role: 'SUPERADMIN', id: 0 });

    // Reload owner from DB within the same transaction context to assert linkage
    const reloadedOwner = await User.findByPk(owner.id, { transaction: tx as any });
    expect(shop).toBeDefined();
    expect(shop.id).toBeTruthy();
    expect(reloadedOwner).toBeDefined();
    expect(reloadedOwner!.shop_id).toBe(shop.id);
  });
});
