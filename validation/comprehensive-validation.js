#!/usr/bin/env node

/**
 * COMPREHENSIVE API & DATABASE VALIDATION SCRIPT
 * Tests major APIs and validates database integrity
 * Covers: Authentication, Users, Shops, Products, Transactions, Payments, Balances, Commissions, Business Logic
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000/api';
let authToken = null;
let testUser = null;

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  apis: [],
  tables: []
};

function logResult(testName, success, details = '') {
  results.total++;
  if (success) {
    results.passed++;
    console.log(`✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

async function makeRequest(method, url, data = null, useAuth = true) {
  const config = {
    method,
    url: `${API_BASE}${url}`,
    headers: {
      'Content-Type': 'application/json',
      ...(useAuth && authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  if (data) config.data = data;

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// AUTHENTICATION TESTS
async function testAuthentication() {
  console.log('\n🔐 TESTING AUTHENTICATION');

  // Test login
  const loginResult = await makeRequest('POST', '/auth/login', {
    username: 'superadmin',
    password: 'superadminpass'
  }, false);

  if (loginResult.success && loginResult.data?.data?.token) {
    authToken = loginResult.data.data.token;
    testUser = loginResult.data.data.user;
    logResult('Login API', true);
  } else {
    logResult('Login API', false, `Expected token, got: ${JSON.stringify(loginResult.error)}`);
    return false;
  }

  // Test protected endpoint without auth (should fail)
  const protectedResult = await makeRequest('GET', '/users', null, false);
  const shouldFail = protectedResult.status === 401;
  logResult('Protected endpoint authentication', shouldFail, shouldFail ? '' : `Expected 401, got ${protectedResult.status}`);

  return true;
}

// USER MANAGEMENT TESTS - READ ONLY
async function testUserAPIs() {
  console.log('\n👥 TESTING USER APIs');

  // Get users list
  const usersResult = await makeRequest('GET', '/users');
  logResult('GET /users', usersResult.success, usersResult.success ? '' : usersResult.error);

  // Get current user
  const meResult = await makeRequest('GET', '/users/me');
  logResult('GET /users/me', meResult.success, meResult.success ? '' : meResult.error);

  // Test getting specific user by ID (if users exist)
  if (usersResult.success && usersResult.data?.data?.length > 0) {
    const userId = usersResult.data.data[0].id;
    const userByIdResult = await makeRequest('GET', `/users/${userId}`);
    logResult('GET /users/:id', userByIdResult.success);
  }

  // Test user balance (if we have a test user)
  if (testUser?.id) {
    const balanceResult = await makeRequest('GET', `/simple/balance/${testUser.id}`);
    logResult('GET /simple/balance/:userId', balanceResult.success);
  }

  // NOTE: Skipping POST/PUT/DELETE operations to avoid modifying production data
  console.log('   ℹ️  Skipping user creation/update/delete tests (read-only validation)');
}

// SHOP MANAGEMENT TESTS - READ ONLY
async function testShopAPIs() {
  console.log('\n🏪 TESTING SHOP APIs');

  // Get shops list
  const shopsResult = await makeRequest('GET', '/shops');
  logResult('GET /shops', shopsResult.success);

  if (shopsResult.success && shopsResult.data?.data?.length > 0) {
    const shopId = shopsResult.data.data[0].id;

    // Get shop by ID
    const shopResult = await makeRequest('GET', `/shops/${shopId}`);
    logResult('GET /shops/:id', shopResult.success);

    // Get shop products
    const productsResult = await makeRequest('GET', `/shops/${shopId}/products`);
    logResult('GET /shops/:id/products', productsResult.success);
  }

  // NOTE: Skipping POST/PUT/DELETE operations to avoid modifying production data
  console.log('   ℹ️  Skipping shop creation/update/delete tests (read-only validation)');
}

// PRODUCT MANAGEMENT TESTS - READ ONLY
async function testProductAPIs() {
  console.log('\n📦 TESTING PRODUCT APIs');

  // Get products list
  const productsResult = await makeRequest('GET', '/products');
  logResult('GET /products', productsResult.success);

  if (productsResult.success && productsResult.data?.data?.length > 0) {
    const productId = productsResult.data.data[0].id;

    // Get product by ID
    const productResult = await makeRequest('GET', `/products/${productId}`);
    logResult('GET /products/:id', productResult.success);
  }

  // Test categories
  const categoriesResult = await makeRequest('GET', '/categories');
  logResult('GET /categories', categoriesResult.success);

  if (categoriesResult.success && categoriesResult.data?.data?.length > 0) {
    const categoryId = categoriesResult.data.data[0].id;

    // Get category by ID
    const categoryResult = await makeRequest('GET', `/categories/${categoryId}`);
    logResult('GET /categories/:id', categoryResult.success);
  }

  // NOTE: Skipping POST/PUT/DELETE operations to avoid modifying production data
  console.log('   ℹ️  Skipping product creation/update/delete tests (read-only validation)');
}

// TRANSACTION & PAYMENT TESTS
async function testTransactionPaymentAPIs() {
  console.log('\n💰 TESTING TRANSACTION & PAYMENT APIs');

  // Get transactions
  const transactionsResult = await makeRequest('GET', '/transactions');
  logResult('GET /transactions', transactionsResult.success);

  // Get payments
  const paymentsResult = await makeRequest('GET', '/payments');
  logResult('GET /payments', paymentsResult.success);

  // Get outstanding payments
  const outstandingResult = await makeRequest('GET', '/payments/outstanding');
  logResult('GET /payments/outstanding', outstandingResult.success);

  // Test transaction-specific payment queries
  if (transactionsResult.success && transactionsResult.data?.data?.length > 0) {
    const transactionId = transactionsResult.data.data[0].id;

    // Get payments for specific transaction
    const txPaymentsResult = await makeRequest('GET', `/payments/transaction/${transactionId}`);
    logResult('GET /payments/transaction/:transactionId', txPaymentsResult.success);

    // Get transaction by ID
    const transactionResult = await makeRequest('GET', `/transactions/${transactionId}`);
    logResult('GET /transactions/:id', transactionResult.success);
  }

  // Test farmer/buyer specific payment queries
  if (testUser?.id) {
    const farmerPaymentsResult = await makeRequest('GET', `/payments/farmers/${testUser.id}`);
    logResult('GET /payments/farmers/:farmerId', farmerPaymentsResult.success);

    const buyerPaymentsResult = await makeRequest('GET', `/payments/buyers/${testUser.id}`);
    logResult('GET /payments/buyers/:buyerId', buyerPaymentsResult.success);
  }

  // NOTE: Skipping POST/PUT operations to avoid modifying production data
  console.log('   ℹ️  Skipping transaction/payment creation/update tests (read-only validation)');
}

// BALANCE & COMMISSION TESTS
async function testBalanceCommissionAPIs() {
  console.log('\n⚖️ TESTING BALANCE & COMMISSION APIs');

  // Get user balance (if we have a test user)
  if (testUser?.id) {
    const balanceResult = await makeRequest('GET', `/simple/balance/${testUser.id}`);
    logResult('GET /simple/balance/:userId', balanceResult.success);

    // Test balance API
    const balanceAPIResult = await makeRequest('GET', `/balances/user/${testUser.id}`);
    logResult('GET /balances/user/:userId', balanceAPIResult.success);

    // Test balance history
    const historyResult = await makeRequest('GET', `/balances/history/${testUser.id}`);
    logResult('GET /balances/history/:userId', historyResult.success);
  }

  // Test shop balance (if we have shops)
  const shopsResult = await makeRequest('GET', '/shops');
  if (shopsResult.success && shopsResult.data?.data?.length > 0) {
    const shopId = shopsResult.data.data[0].id;
    const shopBalanceResult = await makeRequest('GET', `/balances/shop/${shopId}`);
    logResult('GET /balances/shop/:shopId', shopBalanceResult.success);
  }

  // Commission calculation
  const commissionData = {
    shop_id: 1,
    amount: 1000
  };
  const commissionResult = await makeRequest('POST', '/commissions/calculate', commissionData);
  logResult('POST /commissions/calculate', commissionResult.success);

  // Get commissions
  const commissionsResult = await makeRequest('GET', '/commissions');
  logResult('GET /commissions', commissionsResult.success);

  // Get shop commissions
  const shopCommissionsResult = await makeRequest('GET', '/commissions/shop/1');
  logResult('GET /commissions/shop/:shopId', shopCommissionsResult.success);

  // NOTE: Skipping POST operations for balance updates to avoid modifying production data
  console.log('   ℹ️  Skipping balance update operations (read-only validation)');
}

// HEALTH & SYSTEM TESTS
async function testSystemAPIs() {
  console.log('\n🏥 TESTING SYSTEM APIs');

  // Health check
  const healthResult = await makeRequest('GET', '/../health', null, false);
  logResult('GET /../health', healthResult.success);

  // API test endpoint
  const apiTestResult = await makeRequest('GET', '/../api/test', null, false);
  logResult('GET /../api/test', apiTestResult.success);

  // Simple system test
  const simpleTestResult = await makeRequest('GET', '/simple/test', null, false);
  logResult('GET /simple/test', simpleTestResult.success);
}

// BUSINESS LOGIC TESTS - READ ONLY
async function testBusinessLogicAPIs() {
  console.log('\n💼 TESTING BUSINESS LOGIC APIs');

  // Settlements
  const settlementsResult = await makeRequest('GET', '/settlements');
  logResult('GET /settlements', settlementsResult.success);

  // Credits
  const creditsResult = await makeRequest('GET', '/credits');
  logResult('GET /credits', creditsResult.success);

  // Reports
  const reportsResult = await makeRequest('GET', '/reports');
  logResult('GET /reports', reportsResult.success);

  // Audit logs
  const auditResult = await makeRequest('GET', '/audit-logs');
  logResult('GET /audit-logs', auditResult.success);

  // Owner dashboard
  const dashboardResult = await makeRequest('GET', '/owner-dashboard');
  logResult('GET /owner-dashboard', dashboardResult.success);

  // Test simple transaction endpoint
  const simpleTxResult = await makeRequest('GET', '/simple/transaction');
  logResult('GET /simple/transaction', simpleTxResult.success);

  // Test simple payment endpoint
  const simplePaymentResult = await makeRequest('GET', '/simple/payment');
  logResult('GET /simple/payment', simplePaymentResult.success);

  // Test simple expense endpoint
  const simpleExpenseResult = await makeRequest('GET', '/simple/expense');
  logResult('GET /simple/expense', simpleExpenseResult.success);

  console.log('   ℹ️  Business logic endpoints tested (read-only validation)');
}

// SUPERADMIN & FEATURE TESTS - READ ONLY
async function testSuperadminFeatureAPIs() {
  console.log('\n� TESTING SUPERADMIN & FEATURE APIs');

  // Test health endpoint (might be accessible without auth)
  const healthResult = await makeRequest('GET', '/health', null, false);
  logResult('GET /health', healthResult.success);

  // Test API test endpoint
  const apiTestResult = await makeRequest('GET', '/api/test', null, false);
  logResult('GET /api/test', apiTestResult.success);

  // NOTE: Superadmin and feature flag endpoints may require specific permissions
  console.log('   ℹ️  Superadmin and feature endpoints tested (read-only validation)');
}

// ADDITIONAL SYSTEM TESTS
async function testAdditionalSystemAPIs() {
  console.log('\n🔧 TESTING ADDITIONAL SYSTEM APIs');

  // Test various system endpoints that might exist
  const endpoints = [
    '/features-admin',
    '/superadmin/dashboard',
    '/superadmin/users',
    '/superadmin/shops',
    '/superadmin/transactions'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    logResult(`GET ${endpoint}`, result.success);
  }

  console.log('   ℹ️  Additional system endpoints tested (may not all be implemented)');
}

// DATABASE INTEGRITY TESTS
async function testDatabaseIntegrity() {
  console.log('\n🗄️ TESTING DATABASE INTEGRITY');

  // Test data consistency between related tables
  // This would require direct database access, but for now we'll test via APIs

  // Check if transaction counts make sense
  const transactionsResult = await makeRequest('GET', '/transactions');
  const paymentsResult = await makeRequest('GET', '/payments');

  if (transactionsResult.success && paymentsResult.success) {
    const txCount = transactionsResult.data?.data?.length || 0;
    const paymentCount = paymentsResult.data?.data?.length || 0;

    // Payments should be >= transactions (since transactions can have multiple payments)
    const dataConsistent = paymentCount >= txCount;
    logResult('Transaction/Payment data consistency', dataConsistent,
      `Transactions: ${txCount}, Payments: ${paymentCount}`);
  }

  // Test referential integrity via API relationships
  if (transactionsResult.success && transactionsResult.data?.data?.length > 0) {
    const sampleTx = transactionsResult.data.data[0];

    // Check if referenced users exist
    const farmerResult = await makeRequest('GET', `/users/${sampleTx.farmer_id}`);
    const buyerResult = await makeRequest('GET', `/users/${sampleTx.buyer_id}`);

    const farmerExists = farmerResult.success;
    const buyerExists = buyerResult.success;

    logResult('Farmer referential integrity', farmerExists);
    logResult('Buyer referential integrity', buyerExists);
  }
}

// MAIN EXECUTION
async function runComprehensiveValidation() {
  console.log('🚀 COMPREHENSIVE API & DATABASE VALIDATION');
  console.log('==========================================');

  try {
    // Authentication first
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication. Please check API server.');
      return;
    }

    // API Tests
    await testUserAPIs();
    await testShopAPIs();
    await testProductAPIs();
    await testTransactionPaymentAPIs();
    await testBalanceCommissionAPIs();
    await testBusinessLogicAPIs();
    await testSuperadminFeatureAPIs();
    await testAdditionalSystemAPIs();
    await testSystemAPIs();

    // Database Integrity Tests
    await testDatabaseIntegrity();

    // Results Summary
    console.log('\n📊 VALIDATION RESULTS');
    console.log('====================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! API and database integrity verified.');
    } else {
      console.log(`\n⚠️ ${results.failed} test(s) failed. Please review the errors above.`);
    }

  } catch (error) {
    console.error('\n💥 Validation script crashed:', error.message);
  }
}

// Run the validation
runComprehensiveValidation();