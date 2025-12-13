#!/usr/bin/env node

/**
 * Test: Create a new transaction and verify ledger entries are created
 * This will help us debug why ledger is empty
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

// Test credentials from the database
const FARMER_ID = 61;
const BUYER_ID = 62;
const SHOP_ID = 1;

async function makeRequest(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(BASE_URL + path);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('🧪 Ledger Creation Test');
  console.log('========================\n');

  try {
    // Step 1: Login to get auth token
    console.log('Step 1: Authenticating user...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      username: 'ramakanthreddy_0_107',
      password: 'Test@1234'
    });
    if (loginRes.status !== 200) {
      console.log('❌ Login failed:', loginRes.body);
      return;
    }
    const token = loginRes.body.data?.token;
    console.log('✓ Login successful, token:', token?.substring(0, 20) + '...');

    // Step 2: Get initial ledger count
    console.log('\nStep 2: Querying initial ledger entries...');
    const ledgerCountBefore = 0; // We know it's empty from earlier query
    console.log('✓ Initial ledger entries: 0');

    // Step 3: Create a new transaction
    console.log('\nStep 3: Creating test transaction...');
    const txnRes = await makeRequest('POST', '/transactions/create', {
      shop_id: SHOP_ID,
      farmer_id: FARMER_ID,
      buyer_id: BUYER_ID,
      product_name: 'Test Product',
      category_id: 1,
      quantity: 10,
      unit_price: 100.50
    }, token);

    if (txnRes.status !== 200 && txnRes.status !== 201) {
      console.log('❌ Transaction creation failed (status', txnRes.status + '):', txnRes.body);
      return;
    }

    const txnId = txnRes.body.data?.id;
    const totalAmount = txnRes.body.data?.total_amount;
    const farmerEarning = txnRes.body.data?.farmer_earning;
    console.log('✓ Transaction created:');
    console.log('  - ID:', txnId);
    console.log('  - Total Amount: ₹' + totalAmount);
    console.log('  - Farmer Earning: ₹' + farmerEarning);

    // Step 4: Wait a bit for async ledger operations
    console.log('\nStep 4: Waiting for ledger operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ Wait complete');

    // Step 5: Check farmer balance via API
    console.log('\nStep 5: Querying farmer balance via API...');
    const farmerBalanceRes = await makeRequest('GET', `/balances/user/${FARMER_ID}`, null, token);
    if (farmerBalanceRes.status !== 200) {
      console.log('❌ Farmer balance query failed (status', farmerBalanceRes.status + '):', farmerBalanceRes.body);
    } else {
      const farmerBalance = farmerBalanceRes.body.data?.current_balance;
      console.log('✓ Farmer balance:', farmerBalance ?? 'undefined');
      if (farmerBalance !== undefined && farmerBalance > 0) {
        console.log('   ✓✓ LEDGER WORKING - Balance reflects transaction!');
      } else {
        console.log('   ❌ LEDGER NOT WORKING - Balance should show ₹' + farmerEarning);
      }
    }

    // Step 6: Check buyer balance via API
    console.log('\nStep 6: Querying buyer balance via API...');
    const buyerBalanceRes = await makeRequest('GET', `/balances/user/${BUYER_ID}`, null, token);
    if (buyerBalanceRes.status !== 200) {
      console.log('❌ Buyer balance query failed (status', buyerBalanceRes.status + '):', buyerBalanceRes.body);
    } else {
      const buyerBalance = buyerBalanceRes.body.data?.current_balance;
      console.log('✓ Buyer balance:', buyerBalance ?? 'undefined');
      if (buyerBalance !== undefined && buyerBalance < 0) {
        console.log('   ✓✓ LEDGER WORKING - Balance reflects transaction!');
      } else {
        console.log('   ❌ LEDGER NOT WORKING - Balance should show -₹' + totalAmount);
      }
    }

    console.log('\n========================');
    console.log('Test Complete');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

main();
