const axios = require('axios');

const BASE = 'http://localhost:8000';
const SHOP_ID = 1;
const CREDENTIALS = { username: 'ramakanthreddy_0_107', password: 'reddy@123' };

async function login() {
  const r = await axios.post(`${BASE}/api/auth/login`, CREDENTIALS);
  return r.data.data.token;
}

function num(v){ return Number(v ?? 0) || 0; }

async function run() {
  try {
    console.log('Logging in...');
    const token = await login();
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching transactions for shop', SHOP_ID);
    const txResp = await axios.get(`${BASE}/api/transactions?shop_id=${SHOP_ID}&limit=1000`, { headers }).catch(e => { throw new Error('Transactions fetch failed: '+(e.response?JSON.stringify(e.response.data):e.message)); });
    const txs = txResp.data?.data?.transactions || txResp.data?.data || txResp.data || [];
    console.log(`Fetched ${txs.length} transactions`);

    console.log('Fetching payments for shop', SHOP_ID);
    const payResp = await axios.get(`${BASE}/api/payments?shop_id=${SHOP_ID}&limit=1000`, { headers }).catch(e => { throw new Error('Payments fetch failed: '+(e.response?JSON.stringify(e.response.data):e.message)); });
    const payments = payResp.data?.data?.payments || payResp.data?.data || payResp.data || [];
    console.log(`Fetched ${payments.length} payments`);

    const paymentsByTxn = {};
    for (const p of payments) {
      const tid = String(p.transaction_id ?? p.transactionId ?? p.txn_id ?? p.txnId ?? '');
      if (!tid) continue;
      if (!paymentsByTxn[tid]) paymentsByTxn[tid] = [];
      paymentsByTxn[tid].push(p);
    }

    let totalPending = 0;
    console.log('\nPer-transaction pending to farmer (farmer_earning - paid_by_shop_to_farmer):');
    for (const tx of txs) {
      const tid = String(tx.id);
      const farmerEarning = num(tx.farmer_earning ?? tx.farmerEarning ?? tx.farmer_amount ?? tx.farmer_amount);
      const payList = paymentsByTxn[tid] || [];
      const paidToFarmer = payList.filter(p => (String(p.payer_type || p.payer || '').toUpperCase() === 'SHOP') && (String(p.payee_type || p.payee || '').toUpperCase() === 'FARMER') && (String(p.status || '').toUpperCase() === 'PAID')).reduce((s,p)=>s+num(p.amount),0);
      const pending = Math.max(farmerEarning - paidToFarmer, 0);
      if (pending > 0) {
        totalPending += pending;
        console.log(`txn ${tid}: farmer_id=${tx.farmer_id} farmer_earning=${farmerEarning.toFixed(2)} paid=${paidToFarmer.toFixed(2)} pending=${pending.toFixed(2)}`);
      }
    }
    console.log('\nTOTAL pending_to_farmer (API computed):', totalPending.toFixed(2));
  } catch (err) {
    console.error('ERROR:', err.response ? err.response.data : err.message);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
