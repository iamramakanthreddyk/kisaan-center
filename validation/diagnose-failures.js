#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000/api';
const TEST_USERNAME = 'ramakanthreddy_0_107';
const TEST_PASSWORD = 'reddy@123';

async function login() {
  try {
    const r = await axios.post(`${API_BASE}/auth/login`, { username: TEST_USERNAME, password: TEST_PASSWORD });
    return r.data?.data?.token;
  } catch (e) {
    console.error('Login failed:', e.response?.data || e.message);
    process.exit(1);
  }
}

async function call(path, token, useAuth = true) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
    const r = await axios.get(`${API_BASE}${path}`, { headers, timeout: 10000 });
    console.log(`\n[OK] ${path} -> status ${r.status}`);
    console.log(JSON.stringify(r.data, null, 2));
  } catch (err) {
    console.log(`\n[ERR] ${path} ->`);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Body:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('Error:', err.message);
    }
  }
}

(async () => {
  const token = await login();
  console.log('Got token:', !!token);
  const endpoints = [
    '/settlements',
    '/credits',
    '/reports',
    '/owner-dashboard',
    '/health',
    '/api/test'
  ];
  for (const p of endpoints) {
    await call(p, token);
  }
})();
