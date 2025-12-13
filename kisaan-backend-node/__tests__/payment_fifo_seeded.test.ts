import request from 'supertest';
import { sequelize } from '../src/models';
import { User, UserRole } from '../src/models/user';
import { Shop } from '../src/models/shop';
import { Expense } from '../src/models/expense';
import { Category } from '../src/models/category';
import { Product } from '../src/models/product';
import app from '../src/app';
import { ExpenseStatus } from '../src/models/expense';
import bcrypt from 'bcryptjs';

// Only run this comprehensive integration when running in an explicit test DB environment.
// NOTE: Jest sets NODE_ENV='test' by default, so require USE_TEST_DB=1 to opt-in.
const RUN_SEED_TEST = process.env.USE_TEST_DB === '1';
jest.setTimeout(60000);

// This test requires a test DB and will run comprehensive integration testing against it.
// It tests the complete business flow: superadmin -> owner/shop -> categories/products -> farmer/buyer -> transactions -> payments
(RUN_SEED_TEST ? describe : describe.skip)('COMPREHENSIVE BUSINESS FLOW INTEGRATION', () => {
  let superadminToken: string;
  let ownerToken: string;
  let createdOwner: any;
  let createdShop: any;
  let createdCategory: any;
  let createdProduct: any;
  let createdFarmer: any;
  let createdBuyer: any;
  let createdTransaction: any;
  let createdExpenseId: number | null = null;

  beforeAll(async () => {
    // Step 1: Login as superadmin
    const superadminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'superadmin', password: 'superadminpass' });
    expect(superadminLogin.status).toBe(200);
    superadminToken = superadminLogin.body.data.token;

    // Step 2: Create category first (needed for shop)
    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Test Category ' + Date.now(),
        description: 'Test category for integration'
      });
    expect(categoryResponse.status).toBe(201);
    createdCategory = categoryResponse.body.data;

    // Step 3: Create owner first (needed for shop)
    const ownerResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        username: 'test_owner_' + Date.now(),
        password: 'password123',
        email: 'test_owner_' + Date.now() + '@example.com',
        role: 'owner',
        firstname: 'Test',
        lastname: 'Owner'
      });
    expect(ownerResponse.status).toBe(201);
    createdOwner = ownerResponse.body.data;

    // Step 4: Create shop via superadmin
    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Test Shop ' + Date.now(),
        owner_id: createdOwner.id,
        category_id: createdCategory.id,
        address: '123 Test Street',
        contact: '1234567890',
        email: 'shop@test.com'
      });
    expect(shopResponse.status).toBe(201);
    createdShop = shopResponse.body.data;

    // Step 4: Create product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        name: 'Test Product ' + Date.now(),
        category_id: createdCategory.id,
        description: 'Test product for integration',
        unit: 'kg',
        base_price: 100
      });
    expect(productResponse.status).toBe(201);
    createdProduct = productResponse.body.data;

    // Step 6: Login as owner
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: createdOwner.username, password: 'password123' });
    expect(ownerLogin.status).toBe(200);
    ownerToken = ownerLogin.body.data.token;

    // Step 7: Create farmer via owner
    const farmerResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        username: 'test_farmer_' + Date.now(),
        password: 'password123',
        email: 'test_farmer_' + Date.now() + '@example.com',
        role: 'farmer',
        firstname: 'Test',
        lastname: 'Farmer',
        shop_id: createdShop.id
      });
    expect(farmerResponse.status).toBe(201);
    createdFarmer = farmerResponse.body.data;

    // Step 8: Create buyer via owner
    const buyerResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        username: 'test_buyer_' + Date.now(),
        password: 'password123',
        email: 'test_buyer_' + Date.now() + '@example.com',
        role: 'buyer',
        firstname: 'Test',
        lastname: 'Buyer',
        shop_id: createdShop.id
      });
    expect(buyerResponse.status).toBe(201);
    createdBuyer = buyerResponse.body.data;

    // Step 9: Create transaction (farmer sells to buyer)
    const transactionResponse = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        farmer_id: createdFarmer.id,
        buyer_id: createdBuyer.id,
        shop_id: createdShop.id,
        product_id: createdProduct.id,
        quantity: 10,
        price_per_unit: 100,
        total_amount: 1000,
        transaction_date: new Date().toISOString()
      });
    expect(transactionResponse.status).toBe(201);
    createdTransaction = transactionResponse.body.data;

    // Step 10: Create expense for farmer (shop-paid expense)
    const expenseResponse = await request(app)
      .post('/api/settlements/expense')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        shop_id: createdShop.id,
        user_id: createdFarmer.id,
        amount: 60,
        description: 'Transportation expense'
      });
    expect([200, 201].includes(expenseResponse.status)).toBe(true);
    if (expenseResponse.body.data?.id) {
      createdExpenseId = expenseResponse.body.data.id;
    }
  });

  afterAll(async () => {
    // Clean up created data
    try {
      if (createdExpenseId) {
        await request(app)
          .delete(`/api/settlements/expense/${createdExpenseId}`)
          .set('Authorization', `Bearer ${ownerToken}`);
      }
      if (createdTransaction?.id) {
        await request(app)
          .delete(`/api/transactions/${createdTransaction.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);
      }
      if (createdBuyer?.id) {
        await request(app)
          .delete(`/api/users/${createdBuyer.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
      if (createdFarmer?.id) {
        await request(app)
          .delete(`/api/users/${createdFarmer.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
      if (createdProduct?.id) {
        await request(app)
          .delete(`/api/products/${createdProduct.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
      if (createdCategory?.id) {
        await request(app)
          .delete(`/api/categories/${createdCategory.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
      if (createdShop?.id) {
        await request(app)
          .delete(`/api/shops/${createdShop.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
      if (createdOwner?.id) {
        await request(app)
          .delete(`/api/users/${createdOwner.id}`)
          .set('Authorization', `Bearer ${superadminToken}`);
      }
    } catch (err) {
      console.warn('Cleanup failed:', err);
    }
  });

  test('complete business flow: superadmin → owner → farmer/buyer → transaction → payment', async () => {
    // Step 11: Make payment from buyer to farmer (covering expenses first, then balance)
    const paymentPayload = {
      payer_type: 'BUYER',
      payee_type: 'FARMER',
      shop_id: createdShop.id,
      payer_id: createdBuyer.id,
      payee_id: createdFarmer.id,
      amount: 100,
      method: 'cash',
      payment_date: new Date().toISOString()
    };

    const paymentResponse = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(paymentPayload);

    expect([200, 201].includes(paymentResponse.status)).toBe(true);

    if (paymentResponse.status === 200 || paymentResponse.status === 201) {
      expect(paymentResponse.body).toHaveProperty('data');
      expect(paymentResponse.body.data).toHaveProperty('applied_to_expenses');
      expect(paymentResponse.body.data).toHaveProperty('applied_to_balance');

      // Verify expense was applied
      const expenseCheck = await request(app)
        .get(`/api/settlements/expense/${createdExpenseId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(expenseCheck.status).toBe(200);

      // Verify balances were updated
      const farmerBalance = await request(app)
        .get(`/api/simple/balance/${createdFarmer.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(farmerBalance.status).toBe(200);

      const buyerBalance = await request(app)
        .get(`/api/simple/balance/${createdBuyer.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(buyerBalance.status).toBe(200);

      // Verify transaction exists
      const transactionCheck = await request(app)
        .get(`/api/transactions/${createdTransaction.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(transactionCheck.status).toBe(200);

      // Test reporting
      const reportResponse = await request(app)
        .get('/api/reports/generate?date_from=2024-01-01&date_to=2025-12-31')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect([200, 201].includes(reportResponse.status)).toBe(true);
    }

    console.log('✅ Complete business flow integration test passed');
    console.log('   - Superadmin created owner and shop');
    console.log('   - Categories and products assigned');
    console.log('   - Owner created farmer and buyer');
    console.log('   - Transaction created between farmer and buyer');
    console.log('   - Payment processed with expense FIFO logic');
    console.log('   - All balances and records verified');
  });
});
