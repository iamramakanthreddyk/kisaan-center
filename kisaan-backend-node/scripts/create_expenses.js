const axios = require('axios');
require('dotenv').config();

const API_BASE = (
  process.env.VITE_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.API_BASE_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  'http://localhost:8000/api'
);
const USERNAME = 'ramakanthreddy_0_107';
const PASSWORD = 'reddy@123';

async function request(method, path, data, token) {
  try {
    const res = await axios({ method, url: `${API_BASE}${path}`, data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return res.data;
  } catch (err) {
    console.error('Request failed', path, err.response ? err.response.data : err.message);
    throw err;
  }
}

(async () => {
  try {
    const login = await request('post', '/auth/login', { username: USERNAME, password: PASSWORD });
    const token = login.data.token;
    console.log('Logged in, token obtained');

    const expenses = [
      { shop_id: 1, user_id: 3, amount: 500, description: 'Transport', category: 'transport' },
      { shop_id: 1, user_id: 4, amount: 250, description: 'Packaging', category: 'packaging' }
    ];

    for (const e of expenses) {
      const created = await request('post', '/expenses', e, token);
      console.log('Expense created:', created.data ? created.data.id : created);
    }

    console.log('Done creating expenses');
  } catch (err) {
    console.error('Failed to create expenses', err.message || err);
  }
})();