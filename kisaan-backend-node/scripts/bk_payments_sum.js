const http = require('http');
const https = require('https');
const base = process.env.BACKEND_URL || 'http://localhost:8000/api';
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
    console.log('Logged in');
    // Fetch all payments for shop 1
    const allPayments = await requestJson('/api/payments?shop_id=1','GET',undefined,token);
    const payments = allPayments.body?.data || [];
    const bookkeepingBuyer = payments.filter(p => p.transaction_id == null && p.payer_type === 'BUYER' && p.payee_type === 'SHOP' && p.status==='PAID');
    const sumBefore = bookkeepingBuyer.reduce((s,p)=>s+Number(p.amount||0),0);
    console.log('Bookkeeping buyer sum before:', sumBefore, 'count', bookkeepingBuyer.length);

    // create a buyer payment
    const buyerId = 4;
    const amt = 200.00;
    const create = await requestJson('/api/payments','POST',{ payer_type:'BUYER', payee_type:'SHOP', amount: amt, method:'CASH', payment_date: new Date().toISOString(), counterparty_id: buyerId, shop_id:1, status:'PAID' }, token);
    console.log('Create resp:', create.body?.success);

    const allPaymentsAfter = await requestJson('/api/payments?shop_id=1','GET',undefined,token);
    const paymentsA = allPaymentsAfter.body?.data || [];
    const bookkeepingBuyerA = paymentsA.filter(p => p.transaction_id == null && p.payer_type === 'BUYER' && p.payee_type === 'SHOP' && p.status==='PAID');
    const sumAfter = bookkeepingBuyerA.reduce((s,p)=>s+Number(p.amount||0),0);
    console.log('Bookkeeping buyer sum after:', sumAfter, 'count', bookkeepingBuyerA.length);

  } catch (err) { console.error('Err', err); }
})();
