const axios = require('axios');

const BASE = 'http://localhost:8000';
const CREDENTIALS = { username: 'ramakanthreddy_0_107', password: 'reddy@123' };
const SHOP_ID = 1;

async function login() {
  const r = await axios.post(`${BASE}/api/auth/login`, CREDENTIALS).catch(e => { throw new Error('Login failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
  return r.data.data.token;
}

function num(v) { return Number(v ?? 0) || 0; }

async function fetchList(path, params = {}) {
  const url = `${BASE}${path}`;
  const q = new URLSearchParams({ ...params, shop_id: SHOP_ID }).toString();
  const full = `${url}?${q}`;
  const resp = await axios.get(full, { headers }).catch(e => { throw new Error(`Fetch ${path} failed: ${e.response ? JSON.stringify(e.response.data) : e.message}`); });
  return resp.data?.data || resp.data || [];
}

async function run() {
  try {
    console.log('Logging in...');
    const token = await login();
    global.headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching users for shop', SHOP_ID);
    const usersRaw = await fetchList('/api/users', {});
    const users = Array.isArray(usersRaw) ? usersRaw : (usersRaw.users || usersRaw.data || []);
    console.log(`Fetched ${users.length} users`);

    console.log('Fetching transactions for shop', SHOP_ID);
    const txResp = await axios.get(`${BASE}/api/transactions?shop_id=${SHOP_ID}&limit=1000`, { headers }).catch(e => { throw new Error('Transactions fetch failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
    const txs = txResp.data?.data?.transactions || txResp.data?.data || txResp.data || [];
    console.log(`Fetched ${txs.length} transactions`);

    console.log('Fetching payments for shop', SHOP_ID);
    const payResp = await axios.get(`${BASE}/api/payments?shop_id=${SHOP_ID}&limit=1000`, { headers }).catch(e => { throw new Error('Payments fetch failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
    const payments = payResp.data?.data?.payments || payResp.data?.data || payResp.data || [];
    console.log(`Fetched ${payments.length} payments`);

    // Build user map
    const userMap = new Map();
    for (const u of users) {
      const derivedType = (u.role || u.type || u.user_type || (u.is_farmer ? 'farmer' : (u.is_buyer ? 'buyer' : '')) || '').toLowerCase();
      const cumulative = num(u.cumulative_value ?? u.cumulative ?? u.cumulativeValue ?? 0);
      userMap.set(String(u.id), Object.assign({}, u, {
        balance: num(u.balance),
        cumulative,
        type: derivedType,
      }));
    }

    // Helper to extract transaction amounts robustly
    function txBuyerAmount(tx) {
      return num(tx.total_amount ?? tx.total_sale_value ?? tx.total_sale ?? tx.total ?? tx.totalAmount ?? tx.amount);
    }
    function txFarmerAmount(tx) {
      // Try common farmer earning fields, else compute as buyer amount minus commission if commission present
      const direct = num(tx.farmer_earning ?? tx.farmer_amount ?? tx.total_farmer_earnings ?? tx.farmer_earning_amount);
      if (direct) return direct;
      const buyerAmt = txBuyerAmount(tx);
      const commission = num(tx.commission_amount ?? tx.commission ?? tx.total_commission ?? tx.commission_value);
      if (commission) return buyerAmt - commission;
      return 0;
    }

    // Aggregate per-user
    const aggregate = {};
    for (const [id, u] of userMap.entries()) {
      aggregate[id] = {
        id: id,
        username: u.username || u.name,
        reportedBalance: num(u.balance),
        computedBuyerTxTotal: 0,
        computedBuyerPaid: 0,
        computedFarmerEarningsTotal: 0,
        computedFarmerPaid: 0,
        type: u.type || 'unknown',
        cumulative: num(u.cumulative)
      };
    }

    // Walk transactions
    for (const tx of txs) {
      const b = String(tx.buyer_id ?? tx.buyerId ?? tx.buyer);
      const f = String(tx.farmer_id ?? tx.farmerId ?? tx.farmer);
      const buyerAmt = txBuyerAmount(tx);
      const farmerAmt = txFarmerAmount(tx);
      if (userMap.has(b)) aggregate[b].computedBuyerTxTotal += buyerAmt;
      if (userMap.has(f)) aggregate[f].computedFarmerEarningsTotal += farmerAmt;
    }

    // Walk payments
    for (const p of payments) {
      const payerId = String(p.counterparty_id ?? p.payer_id ?? p.payerId ?? p.user_id ?? p.userId ?? '');
      const payeeId = String(p.counterparty_id ?? p.payee_id ?? p.payeeId ?? p.user_id ?? p.userId ?? '');
      const amount = num(p.amount ?? p.payment_amount ?? p.value);
      const payerType = (p.payer_type || p.payer || '').toString().toLowerCase();
      const payeeType = (p.payee_type || p.payee || '').toString().toLowerCase();
      // If payer_type exists and counterparty_id is present, use that mapping
      if (payerType.includes('buyer') && payerId && aggregate[payerId]) aggregate[payerId].computedBuyerPaid += amount;
      if (payeeType.includes('farmer') && payeeId && aggregate[payeeId]) aggregate[payeeId].computedFarmerPaid += amount;
      // Also handle payments recorded with transaction_id linking: some payments may use counterparty differently
      // Fallback: if payer_type is shop and payee_type is farmer and counterparty_id is farmer id
      if ((p.payer_type || '').toString().toLowerCase() === 'shop' && (p.payee_type || '').toString().toLowerCase() === 'farmer') {
        if (p.counterparty_id && aggregate[String(p.counterparty_id)]) aggregate[String(p.counterparty_id)].computedFarmerPaid += amount;
      }
      if ((p.payer_type || '').toString().toLowerCase() === 'buyer' && p.counterparty_id && aggregate[String(p.counterparty_id)]) {
        aggregate[String(p.counterparty_id)].computedBuyerPaid += amount;
      }
    }

    // Print per-user reconciliation
    console.log('\nPer-user reconciliation:');
    for (const id of Object.keys(aggregate)) {
      const a = aggregate[id];
      const expectedBuyerBalance = a.computedBuyerTxTotal - a.computedBuyerPaid;
      const expectedFarmerBalance = a.computedFarmerEarningsTotal - a.computedFarmerPaid;
      // Choose expected based on user's type
      let expected = 0;
      if (a.type && a.type.includes('farmer')) expected = expectedFarmerBalance;
      else if (a.type && a.type.includes('buyer')) expected = expectedBuyerBalance;
      else {
        // Unknown: report both
        expected = expectedBuyerBalance; // default
      }
      const diff = num(a.reportedBalance) - num(expected);
      console.log(`\nUser ${a.id} (${a.username}) type=${a.type} reportedBalance=${a.reportedBalance.toFixed(2)} expected(${a.type.includes('farmer')? 'farmer':'buyer'})=${expected.toFixed(2)} diff=${diff.toFixed(2)}`);
      console.log(`  buyerTxTotal=${a.computedBuyerTxTotal.toFixed(2)} buyerPaid=${a.computedBuyerPaid.toFixed(2)} farmerEarnings=${a.computedFarmerEarningsTotal.toFixed(2)} farmerPaid=${a.computedFarmerPaid.toFixed(2)} cumulative=${a.cumulative.toFixed(2)}`);
    }

    // Print notable anomalies
    console.log('\nAnomalies:');
    for (const id of Object.keys(aggregate)) {
      const a = aggregate[id];
      const expected = (a.type && a.type.includes('farmer')) ? (a.computedFarmerEarningsTotal - a.computedFarmerPaid) : (a.computedBuyerTxTotal - a.computedBuyerPaid);
      const diff = num(a.reportedBalance) - num(expected);
      if (Math.abs(diff) > 0.5) {
        console.log(`  - User ${a.id} (${a.username}) mismatch diff=${diff.toFixed(2)} type=${a.type}`);
      }
      // Also flag users that look like farmers by username but are typed as buyer
      if ((a.username || '').toLowerCase().includes('farmer') && !(a.type && a.type.includes('farmer'))) {
        console.log(`  - User ${a.id} (${a.username}) username suggests farmer but type='${a.type}'`);
      }
    }

  } catch (err) {
    console.error('ERROR:', err.message || err);
    if (err.response?.data) console.error(err.response.data);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
