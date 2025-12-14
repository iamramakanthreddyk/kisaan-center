// Lightweight script to create a standalone payment using owner credentials from env or defaults
const http = require('http');
const https = require('https');
const url = require('url');
const base = (
  process.env.VITE_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.API_BASE_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  'http://localhost:8000/api'
);
const ownerUser = process.env.TEST_USER || 'ramakanthreddy_0_107';
const ownerPass = process.env.TEST_PASS || 'reddy@123';

function requestJson(path, method = 'GET', body = undefined, token = undefined) {
  const full = new URL(path, base);
  const lib = full.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const req = lib.request(full, { method, headers }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          resolve(parsed);
        } catch (err) {
          reject(new Error('Invalid JSON response: ' + raw));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  // Use absolute API path to avoid base-url resolution quirks
  const resp = await requestJson('/api/auth/login', 'POST', { username: ownerUser, password: ownerPass });
  if (!resp || !resp.success) throw new Error('Login failed: ' + JSON.stringify(resp));
  return resp;
}

async function createPayment(token) {
  const payload = {
    payer_type: 'SHOP',
    payee_type: 'FARMER',
    amount: 50.00,
    method: 'CASH',
    payment_date: new Date().toISOString(),
    counterparty_id: 3,
    shop_id: 1,
    status: 'PAID',
    force_override: true
  };
  return requestJson('/api/payments', 'POST', payload, token);
}

(async ()=>{
  try {
    console.log('Logging in...');
      const loginResp = await login();
      // login returns full response body { success, message, data: { token, user } }
      const token = loginResp?.data?.token || loginResp?.token;
  const masked = token ? `${String(token).slice(0,8)}...${String(token).slice(-8)}` : null;
  console.log('Creating payment... token:', masked);
    const resp = await createPayment(token);
    console.log('Create payment response:\n', JSON.stringify(resp, null, 2));

    // Fetch owner dashboard to see if balances reflect the new payment
    try {
  const dash = await requestJson('/api/owner-dashboard/dashboard', 'GET', undefined, token);
      console.log('\nOwner dashboard snapshot:\n', JSON.stringify(dash, null, 2));
    } catch (e) {
      console.warn('Failed to fetch owner dashboard:', e);
    }

    // Verify payment shows up in farmer payments listing
    try {
      const farmPayments = await requestJson(`/api/payments/farmers/3?startDate=&endDate=`, 'GET', undefined, token);
      console.log('\nPayments to farmer 3:\n', JSON.stringify(farmPayments, null, 2));
    } catch (e) {
      console.warn('Failed to fetch farmer payments:', e);
    }

    // Verify payments root with ?transaction_id (should be empty for this standalone payment)
    try {
      const paymentsByTxn = await requestJson(`/api/payments?transaction_id=999999`, 'GET', undefined, token);
      console.log('\nPayments by transaction (non-existent) response:\n', JSON.stringify(paymentsByTxn, null, 2));
    } catch (e) {
      console.warn('Failed to fetch payments by transaction query:', e);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  }
})();
