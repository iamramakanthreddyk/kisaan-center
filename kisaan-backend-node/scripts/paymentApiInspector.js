const axios = require('axios');

const BASE = 'http://localhost:8000/api';
const CREDENTIALS = { username: 'ramakanthreddy_0_107', password: 'reddy@123' };

async function run() {
  console.log('Payment API Inspector - logging in...');
  const login = await axios.post(`${BASE}/auth/login`, CREDENTIALS);
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log('Creating a transaction with partial payments...');
  const txnResp = await axios.post(`${BASE}/transactions/`, {
    shop_id: 1,
    farmer_id: 57,
    buyer_id: 4,
    category_id: 1,
    product_id: 801,
    product_name: 'Inspector Roses',
    quantity: 10,
    unit_price: 100,
    commission_rate: 10,
    transaction_date: new Date().toISOString().split('T')[0],
    notes: 'inspector txn',
    payments: [
      { payer_type: 'buyer', payee_type: 'shop', amount: 500, method: 'upi', status: 'PENDING', payment_date: new Date().toISOString() },
      { payer_type: 'shop', payee_type: 'farmer', amount: 400, method: 'upi', status: 'PENDING', payment_date: new Date().toISOString() }
    ]
  }, { headers });

  console.log('Transaction created:', txnResp.data.data.id);
  const txnId = txnResp.data.data.id;
  console.log('Creating a bookkeeping payment to farmer (not tied to txn)...');
  const bkResp = await axios.post(`${BASE}/payments/`, {
    payer_type: 'shop', payee_type: 'farmer', amount: 400, method: 'cash', status: 'PAID', notes: 'inspector bookkeeping', counterparty_id: 57, shop_id: 1, payment_date: new Date().toISOString()
  }, { headers });

  console.log('Bookkeeping payment created:', bkResp.data.data.id);
  const bkId = bkResp.data.data.id;

  console.log('Listing recent payments (API):');
  const listResp = await axios.get(`${BASE}/payments/?shop_id=1&limit=20`, { headers });
  console.log(JSON.stringify(listResp.data, null, 2));

  console.log('Listing payment allocations (API):');
  try {
    const allocResp = await axios.get(`${BASE}/payment-allocations/?shop_id=1&limit=50`, { headers });
    console.log(JSON.stringify(allocResp.data, null, 2));
  } catch (e) {
    console.warn('Allocation endpoint not available or failed:', e.response ? e.response.data : e.message);
  }

  console.log('Fetching owner dashboard:');
  const dashResp = await axios.get(`${BASE}/owner-dashboard/dashboard`, { headers });
  console.log(JSON.stringify(dashResp.data, null, 2));

  // Call payment-specific endpoints
  console.log('\nGET /payments/transaction/:transactionId');
  try {
    const r = await axios.get(`${BASE}/payments/transaction/${txnId}`, { headers });
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) { console.warn('failed', e.response ? e.response.data : e.message); }

  console.log('\nGET /payments/farmers/:farmerId');
  try {
    const r = await axios.get(`${BASE}/payments/farmers/57`, { headers });
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) { console.warn('failed', e.response ? e.response.data : e.message); }

  console.log('\nGET /payments/buyers/:buyerId');
  try {
    const r = await axios.get(`${BASE}/payments/buyers/4`, { headers });
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) { console.warn('failed', e.response ? e.response.data : e.message); }

  console.log('\nGET /payments/outstanding');
  try {
    const r = await axios.get(`${BASE}/payments/outstanding`, { headers });
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) { console.warn('failed', e.response ? e.response.data : e.message); }
}

run().catch(e => {
  console.error('Inspector failed:', e.response ? e.response.data : e.message);
  process.exit(1);
});
