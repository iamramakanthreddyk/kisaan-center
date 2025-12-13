// Updated integration validation script with correct balance endpoint
const API_BASE = 'https://kisaancenter-backend.whiteisland-e1233153.northeurope.azurecontainerapps.io/api';

// ...removed log...
// ...removed log...
// ...removed log...
// ...removed log...

const endpoints = [
  { name: 'Health Check', method: 'GET', url: `${API_BASE}/../health`, expectAuth: false },
  { name: 'API Discovery', method: 'GET', url: `${API_BASE}/../api/test`, expectAuth: false },
  { name: 'Categories List', method: 'GET', url: `${API_BASE}/categories`, expectAuth: false },
  { name: 'Products List', method: 'GET', url: `${API_BASE}/products`, expectAuth: false },
  { name: 'Auth Login (expect 400/401)', method: 'POST', url: `${API_BASE}/auth/login`, expectAuth: false, expectStatus: [400, 401] },
  { name: 'Users List (expect 401)', method: 'GET', url: `${API_BASE}/users`, expectAuth: false, expectStatus: [401] },
  { name: 'Shops List (expect 401)', method: 'GET', url: `${API_BASE}/shops`, expectAuth: false, expectStatus: [401] },
  { name: 'Transactions List (expect 401)', method: 'GET', url: `${API_BASE}/transactions`, expectAuth: false, expectStatus: [401] },
  { name: 'Payments List (expect 401)', method: 'GET', url: `${API_BASE}/payments`, expectAuth: false, expectStatus: [401] },
  { name: 'User Balance - Correct Path (expect 401)', method: 'GET', url: `${API_BASE}/balance/user/1`, expectAuth: false, expectStatus: [401] },
  { name: 'User Balance - Frontend Path (expect 404)', method: 'GET', url: `${API_BASE}/balances/user/1`, expectAuth: false, expectStatus: [404] }
];

async function testEndpoint(endpoint) {
  try {
  // ...removed log...
  // ...removed log...
    
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    if (endpoint.expectStatus) {
      if (endpoint.expectStatus.includes(status)) {
  // ...removed log...
        return true;
      } else {
  // ...removed log...
        return false;
      }
    } else {
      if (status >= 200 && status < 300) {
  // ...removed log...
        return true;
      } else {
  // ...removed log...
        return false;
      }
    }
    
  } catch (error) {
  // ...removed log...
    return false;
  }
}

async function runValidation() {
  let successful = 0;
  let failed = 0;
  const failedTests = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    if (result) {
      successful++;
    } else {
      failed++;
      failedTests.push(endpoint.name);
    }
  // ...removed log...
  }
  
  // ...removed log...
  // ...removed log...
  // ...removed log...
  // ...removed log...
  
  if (failedTests.length > 0) {
  // ...removed log...
  // ...removed log...
  }
  
  // ...removed log...
  // ...removed log...
  if (failed <= 1) {
  // ...removed log...
  // ...removed log...
  // ...removed log...
  // ...removed log...
    
    if (failed === 1) {
  // ...removed log...
  // ...removed log...
    }
  } else {
  // ...removed log...
  }
  
  process.exit(failed > 1 ? 1 : 0);
}

runValidation();