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

(async ()=>{
  try{
    const login = await requestJson('/api/auth/login','POST',{ username: 'ramakanthreddy_0_107', password: 'reddy@123' });
    const token = login.body.data.token;
    console.log('token obtained');
  const before = await requestJson('/api/debug/buyer-due/4?owner_id=2','GET',undefined,token);
    console.log('before', before.body);
    const create = await requestJson('/api/payments','POST',{ payer_type:'BUYER', payee_type:'SHOP', amount: 99.99, method:'CASH', payment_date: new Date().toISOString(), counterparty_id:4, shop_id:1, status:'PAID' }, token);
    console.log('create', create.body.success);
  const after = await requestJson('/api/debug/buyer-due/4?owner_id=2','GET',undefined,token);
    console.log('after', after.body);
  } catch (err) { console.error(err); }
})();
