#!/usr/bin/env node
/**
 * Test: Create transaction and verify ledger is working
 */
const http = require('http');

const BASE_URL = 'http://localhost:8000/api';

function makeRequest(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
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
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    console.log('🧪 Testing Ledger System\n');

    // Login
    console.log('1️⃣ Logging in...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      username: 'ramakanthreddy_0_107',
      password: 'reddy@123'
    });
    const token = loginRes.body.data?.token;
    console.log(`✓ Logged in, token: ${token?.substring(0, 20)}...\n`);

    // Create transaction
    console.log('2️⃣ Creating transaction...');
    const txnRes = await makeRequest('POST', '/transactions/create', {
      shop_id: 1,
      farmer_id: 61,
      buyer_id: 62,
      product_name: 'Test',
      category_id: 1,
      quantity: 10,
      unit_price: 100
    }, token);
    const txnId = txnRes.body.data?.id;
    console.log(`✓ Transaction created: ID ${txnId}\n`);

    // Check farmer balance
    console.log('3️⃣ Checking farmer balance...');
    const fRes = await makeRequest('GET', '/balances/user/61', null, token);
    console.log(`✓ Farmer balance: ${fRes.body.data?.current_balance}\n`);

    // Check buyer balance
    console.log('4️⃣ Checking buyer balance...');
    const bRes = await makeRequest('GET', '/balances/user/62', null, token);
    console.log(`✓ Buyer balance: ${bRes.body.data?.current_balance}\n`);

    if (fRes.body.data?.current_balance > 0 && bRes.body.data?.current_balance < 0) {
      console.log('✅ LEDGER SYSTEM WORKING!');
    } else {
      console.log('❌ LEDGER NOT WORKING - balances should show transaction amounts');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
