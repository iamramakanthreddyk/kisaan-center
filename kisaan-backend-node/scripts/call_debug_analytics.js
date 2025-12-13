const axios = require('axios');
const BASE = 'http://localhost:8000';
const CREDENTIALS = { username: 'ramakanthreddy_0_107', password: 'reddy@123' };

async function login() {
  const r = await axios.post(`${BASE}/api/auth/login`, CREDENTIALS);
  return r.data.data.token;
}

async function run() {
  try {
    const token = await login();
    const headers = { Authorization: `Bearer ${token}` };
  const resp = await axios.get(`${BASE}/api/transactions/analytics?shop_id=1`, { headers });
  console.log('ANALYTICS RESPONSE:', JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('ERROR:', err.response ? err.response.data : err.message);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
