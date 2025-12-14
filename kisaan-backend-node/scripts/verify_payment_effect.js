// Verify payment affects owner dashboard metrics
const http = require('http');
const https = require('https');
const base = (
  process.env.VITE_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.API_BASE_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  'http://localhost:8000/api'
);
const OWNER = process.env.TEST_USER || 'ramakanthreddy_0_107';
const PASS = process.env.TEST_PASS || 'reddy@123';

function requestJson(path, method='GET', body=undefined, token=undefined){
  const urlObj = new URL(path, base);
  const lib = urlObj.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Promise((resolve,reject)=>{
    const req = lib.request(urlObj, { method, headers }, (res)=>{
      let raw=''; res.setEncoding('utf8'); res.on('data', c=>raw+=c); res.on('end', ()=>{
        try{ resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }); }
        catch(e){ resolve({ status: res.statusCode, body: raw }); }
      });
    }); req.on('error', reject); if (data) req.write(data); req.end();
  });
}

async function login(){
  const r = await requestJson('/api/auth/login','POST',{ username: OWNER, password: PASS });
  if (!r.body || !r.body.success) throw new Error('Login failed: '+JSON.stringify(r.body));
  return r.body.data.token;
}

(async ()=>{
  try{
    const token = await login();
    console.log('Token obtained');
    // 1. Snapshot dashboard before
    const before = await requestJson('/api/owner-dashboard/dashboard','GET',undefined, token);
    console.log('Before dashboard:', JSON.stringify(before.body, null, 2));

    // 2. Create a distinct payment amount using timestamp to make diff clear
    const unique = Math.floor((Date.now() % 1000) + 123); // small unique amount
    const payload = {
      payer_type: 'SHOP', payee_type: 'FARMER', amount: unique, method: 'CASH', payment_date: new Date().toISOString(), counterparty_id: 3, shop_id: 1, status: 'PAID', force_override: true
    };
    const create = await requestJson('/api/payments','POST',payload,token);
    console.log('Create payment response:', JSON.stringify(create.body, null, 2));

    // 3. Snapshot dashboard after
    const after = await requestJson('/api/owner-dashboard/dashboard','GET',undefined, token);
    console.log('After dashboard:', JSON.stringify(after.body, null, 2));

    // 4. Fetch farmer payments for id=3 (no date filters)
    const farmPayments = await requestJson('/api/payments/farmers/3','GET',undefined, token);
    console.log('Farmer payments (raw):', JSON.stringify(farmPayments, null, 2));

    // Simple numeric comparison for farmer_total_earned if present
    const beforeEarned = Number(before.body?.farmer_total_earned || before.body?.farmer_total_earned || 0);
    const afterEarned = Number(after.body?.farmer_total_earned || after.body?.farmer_total_earned || 0);
    console.log(`Delta farmer_total_earned = ${afterEarned - beforeEarned} (expected approx ${unique})`);

  }catch(err){
    console.error('Error', err.response || err.message || err);
  }
})();
