const axios = require('axios');

const BASE = (
  process.env.VITE_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.API_BASE_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  'http://localhost:8000/api'
);
const OWNER = process.argv[2] || 'ramakanthreddy_0_107';
const PASS = process.argv[3] || 'reddy@123';

async function run() {
  try {
    console.log('Logging in as', OWNER);
    const login = await axios.post(`${BASE}/auth/login`, { username: OWNER, password: PASS });
    const token = login.data?.data?.token;
    if (!token) throw new Error('No token returned from auth');
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    // Discover farmer and buyer from user list to match test environment
    const usersResp = await axios.get(`${BASE}/users/`, headers);
    const users = usersResp.data?.data || [];
    let farmerId = null;
    let buyerId = null;
    for (const u of users) {
      const role = (u.role || '').toUpperCase();
      if (!farmerId && role === 'FARMER') farmerId = u.id;
      if (!buyerId && role === 'BUYER') buyerId = u.id;
      if (farmerId && buyerId) break;
    }

    // Fallback to defaults if not found
    farmerId = farmerId || 2;
    buyerId = buyerId || 3;

    // Transaction payload - adjust IDs if your environment differs
    const payload = {
      shop_id: 1,
      farmer_id: farmerId,
      buyer_id: buyerId,
      category_id: 1,
      product_name: 'Onion',
      quantity: 1,
      unit_price: 100,
      payments: [
        { payer_type: 'BUYER', payee_type: 'SHOP', amount: 100, method: 'CASH' },
        { payer_type: 'SHOP', payee_type: 'FARMER', amount: 90, method: 'CASH' }
      ]
    };

    console.log('Creating transaction (attempt 1: no payments)...');
    let create;
    try {
      create = await axios.post(`${BASE}/transactions`, { ...payload, payments: undefined }, headers);
    } catch (err) {
      // If server complains that provided farmer payment exceeds farmer earning, try to parse the allowed farmer_earning
      const errData = err.response?.data || err.message || '';
      console.warn('Create failed:', JSON.stringify(errData, null, 2));
      const msg = (errData && errData.message) ? String(errData.message) : String(errData);
      const match = msg.match(/Farmer payment \((\d+(?:\.\d+)?)\) cannot exceed farmer earning \((\d+(?:\.\d+)?)\)/i);
      if (match) {
        const farmerAllowed = Number(match[2]);
        console.log('Detected farmer earning from error:', farmerAllowed);
        // Retry with explicit payments using the discovered farmer earning
        const buyerAmount = Number(payload.unit_price * payload.quantity || 0);
        const retryPayload = {
          ...payload,
          payments: [
            { payer_type: 'BUYER', payee_type: 'SHOP', amount: buyerAmount, method: 'CASH' },
            { payer_type: 'SHOP', payee_type: 'FARMER', amount: farmerAllowed, method: 'CASH' }
          ]
        };
        console.log('Retrying create with corrected payments:', JSON.stringify(retryPayload, null, 2));
        create = await axios.post(`${BASE}/transactions`, retryPayload, headers);
      } else {
        throw err;
      }
    }
    console.log('Create response:');
    console.log(JSON.stringify(create.data, null, 2));

    const txnId = create.data?.data?.id;
    if (!txnId) {
      console.error('No transaction id returned');
      return;
    }

    console.log('\nFetching payments for transaction', txnId);
    const payments = await axios.get(`${BASE}/payments/?transaction_id=${txnId}`, headers);
    console.log(JSON.stringify(payments.data, null, 2));

    console.log('\nFetching payment allocations for transaction', txnId);
    // Try common endpoints; APIs may differ
    try {
      const alloc = await axios.get(`${BASE}/payment-allocations?transaction_id=${txnId}`, headers);
      console.log(JSON.stringify(alloc.data, null, 2));
    } catch (e) {
      console.warn('payment-allocations endpoint not available or failed:', e.response?.data || e.message);
    }

  } catch (err) {
    console.error('Error running test transaction:', err.response?.data || err.message || err);
    process.exit(1);
  }
}

run();
