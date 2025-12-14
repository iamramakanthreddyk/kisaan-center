require('dotenv').config();
const axios = require('axios');

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

let token = null;
let user = null;
let shopId = null;
let farmerId = null;
let buyerId = null;
let productId = null;
let categoryId = null;

async function login() {
  console.log('Logging in...');
  const login = await axios.post(`${API_BASE}/auth/login`, { username: USERNAME, password: PASSWORD });
  token = login.data?.data?.token;
  user = login.data?.data?.user;
  if (!token) {
    console.error('Login failed', login.data);
    return false;
  }
  console.log('Token acquired, user role:', user?.role);
  return true;
}

async function fetchData() {
  const headers = { Authorization: `Bearer ${token}` };

  // Get shops
  const shops = await axios.get(`${API_BASE}/shops`, { headers });
  if (shops.data?.data?.length > 0) {
    shopId = shops.data.data[0].id;
    console.log('Using shop ID:', shopId);
  } else {
    console.error('No shops found');
    return false;
  }

  // Get products
  const products = await axios.get(`${API_BASE}/products`, { headers });
  if (products.data?.data?.length > 0) {
    productId = products.data.data[0].id;
    categoryId = products.data.data[0].category_id;
    console.log('Using product ID:', productId, 'category ID:', categoryId);
  } else {
    console.error('No products found');
    return false;
  }

  // Get users (farmers and buyers)
  const users = await axios.get(`${API_BASE}/users`, { headers });
  const farmers = users.data?.data?.filter(u => u.role === 'farmer') || [];
  const buyers = users.data?.data?.filter(u => u.role === 'buyer') || [];
  if (farmers.length > 0) farmerId = farmers[0].id;
  if (buyers.length > 0) buyerId = buyers[0].id;
  console.log('Using farmer ID:', farmerId, 'buyer ID:', buyerId);

  return farmerId && buyerId;
}

async function run() {
  if (!(await login())) return;
  if (!(await fetchData())) return;

  const payload = {
    shop_id: shopId,
    farmer_id: farmerId,
    buyer_id: buyerId,
    category_id: categoryId,
    product_id: productId,
    product_name: "Test Product",
    quantity: 10,
    unit_price: 50,
    commission_rate: 10,
    notes: "Test transaction",
    transaction_date: "2025-10-19",
    payments: []
  };

  // Compute expected statuses
  const total = payload.quantity * payload.unit_price;
  const commission = (total * (payload.commission_rate || 10)) / 100;
  const farmerEarning = total - commission;
  const buyerAmount = 500; // Partial payment
  const farmerAmount = 400; // Partial payment
  const now = new Date().toISOString();
  const buyerStatus = buyerAmount >= total ? 'PAID' : 'PENDING';
  const farmerStatus = farmerAmount >= farmerEarning ? 'PAID' : 'PENDING';
  payload.payments = [
    { payer_type: 'BUYER', payee_type: 'SHOP', amount: buyerAmount, method: 'CASH', status: buyerStatus, payment_date: now },
    { payer_type: 'SHOP', payee_type: 'FARMER', amount: farmerAmount, method: 'CASH', status: farmerStatus, payment_date: now }
  ];

  console.log('Creating transaction with payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(`${API_BASE}/transactions`, payload, { headers: { Authorization: `Bearer ${token}` } });
    console.log('TRANSACTION RESPONSE:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    const e = err;
    if (e.response) {
      console.error('HTTP', e.response.status, JSON.stringify(e.response.data, null, 2));
    } else {
      console.error('Error', e.message || e);
    }
  }
}

run();
