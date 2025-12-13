const http = require('http');
const https = require('https');
const base = process.env.BACKEND_URL || 'http://localhost:8000/api';
const ownerUser = process.env.TEST_USER || 'ramakanthreddy_0_107';
const ownerPass = process.env.TEST_PASS || 'reddy@123';

function requestJson(fullUrl, method='POST', body) {
  const urlObj = new URL(fullUrl, base);
  const lib = urlObj.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  return new Promise((resolve, reject) => {
    const req = lib.request(urlObj, { method, headers }, (res) => {
      let raw=''; res.setEncoding('utf8'); res.on('data',c=>raw+=c); res.on('end',()=>{
        try { resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }); } catch(e){ resolve({ status: res.statusCode, body: raw }); }
      });
    }); req.on('error', reject); if (data) req.write(data); req.end();
  });
}

(async ()=>{
  try {
    const r = await requestJson('/api/auth/login','POST',{ username: ownerUser, password: ownerPass });
    console.log('Status:', r.status);
    console.log('Body:', JSON.stringify(r.body, null, 2));
  } catch (err) { console.error('Err', err); }
})();
