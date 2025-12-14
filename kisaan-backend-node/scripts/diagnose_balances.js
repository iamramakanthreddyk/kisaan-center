const axios = require('axios');
require('dotenv').config();
const BASE = (
  process.env.VITE_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.API_BASE_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  'http://localhost:8000/api'
);

async function login(){
  const l = await axios.post(`${BASE}/auth/login`, { username: 'ramakanthreddy_0_107', password: 'reddy@123' });
  return l.data.data.token;
}

(async ()=>{
  try{
    const token = await login();
    const h = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Fetching owner dashboard...');
    const dash = await axios.get(`${BASE}/owner-dashboard/dashboard`, h);
    console.log('owner dashboard:', JSON.stringify(dash.data, null, 2));
    if (dash.data && dash.data.debug_info) {
      console.log('\nOWNER DASHBOARD debug_info:', JSON.stringify(dash.data.debug_info, null, 2));
    } else {
      console.log('\nOWNER DASHBOARD debug_info: <not present>');
    }

    // Call dev debug endpoint for a sample buyer (buyerId=4) to get per-buyer breakdown
    try {
      console.log('\nCalling dev debug route /debug/buyer-due/4 (owner-scoped)');
      const dbg = await axios.get(`${BASE}/debug/buyer-due/4?owner_id=1`, h);
      console.log('/debug/buyer-due/4 =>', JSON.stringify(dbg.data, null, 2));
    } catch (e) {
      console.log('/debug/buyer-due/4 call failed', e.response ? e.response.data : e.message);
    }

    console.log('\nFetching users...');
    const users = await axios.get(`${BASE}/users`, h);
    console.log('users snapshot count:', users.data?.data?.length || users.data?.length || 0);

    console.log('\nFetching payments for shop 1...');
    const payments = await axios.get(`${BASE}/payments?shop_id=1`, h);
    console.log('payments count (query):', payments.data?.data?.length || 0);

    console.log('\nFetching allocations (via endpoint or fallback)...');
    try {
      const allocs = await axios.get(`${BASE}/payments/outstanding`, h);
      console.log('/payments/outstanding =>', allocs.data?.data?.length || 0);
    } catch(e){ console.log('/payments/outstanding not present or failed', e.response ? e.response.data : e.message); }

    console.log('\nFetching raw payments allocated via transaction endpoint (per transaction)');

    // fetch payments by tx if possible
    try{
      const txs = await axios.get(`${BASE}/transactions?shop_id=1`, h);
      const tarr = txs.data?.data || [];
      console.log('transactions count:', tarr.length);
      if (tarr.length) {
        const sample = tarr.slice(0,5);
        for (const t of sample) {
          const txPayments = await axios.get(`${BASE}/payments?transaction_id=${t.id}`, h);
          console.log(`txn ${t.id} payments:`, txPayments.data?.data?.length || 0);
        }
      }
    } catch(e){ console.log('transactions listing failed', e.response ? e.response.data : e.message); }

    console.log('\nFetching expenses for shop 1...');
    try{ const ex = await axios.get(`${BASE}/expenses?shop_id=1`, h); console.log('expenses:', ex.data?.data?.length || 0); } catch(e){ console.log('get expenses failed', e.response ? e.response.data : e.message); }

  } catch(err){ console.error('diagnose failed', err.response ? err.response.data : err.message); }
})();