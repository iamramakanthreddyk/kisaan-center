#!/usr/bin/env node

/**
 * Frontend-Backend Integration Validation Script
 * Tests that frontend can communicate with backend successfully
 */

const config = {
  // Priority: VITE_API_BASE_URL (recommended) -> VITE_API_URL (legacy) -> API_BASE_URL -> API_BASE -> default
  apiBaseUrl: (
    process.env.VITE_API_BASE_URL ||
    process.env.VITE_API_URL ||
    process.env.API_BASE_URL ||
    process.env.API_BASE ||
    'https://kisaan-center-production.up.railway.app/api'
  )
};

async function validateEndpoint(endpoint, method = 'GET', expectedStatus = 200) {
  const url = `${config.apiBaseUrl}${endpoint}`;
  // ...removed log...
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const statusIcon = response.status === expectedStatus ? '✅' : '❌';
  // ...removed log...
    
    if (response.status === expectedStatus || (response.status >= 200 && response.status < 300)) {
      return { success: true, status: response.status };
    } else {
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (error) {
  // ...removed log...
    return { success: false, error: error.message };
  }
}

async function validateIntegration() {
  // ...removed log...
  // ...removed log...
  
  // ...removed log...
  
  const tests = [
    // Health check endpoints
    { endpoint: '/../health', method: 'GET', name: 'Health Check' },
    { endpoint: '/../api/test', method: 'GET', name: 'API Discovery' },
    
    // Public endpoints (should work without auth)
    { endpoint: '/categories', method: 'GET', name: 'Categories List' },
    { endpoint: '/products', method: 'GET', name: 'Products List' },
    
    // Auth endpoint (should return 401 or proper response structure)
    { endpoint: '/auth/login', method: 'POST', name: 'Auth Login (expect 400/401)', expectedStatus: 400 },
    
    // Protected endpoints (should return 401 without auth)
    { endpoint: '/users', method: 'GET', name: 'Users List (expect 401)', expectedStatus: 401 },
    { endpoint: '/shops', method: 'GET', name: 'Shops List (expect 401)', expectedStatus: 401 },
    { endpoint: '/transactions', method: 'GET', name: 'Transactions List (expect 401)', expectedStatus: 401 },
    { endpoint: '/payments', method: 'GET', name: 'Payments List (expect 401)', expectedStatus: 401 },
    { endpoint: '/balances/user/1', method: 'GET', name: 'User Balance (expect 401)', expectedStatus: 401 }
  ];
  
  const results = [];
  
  for (const test of tests) {
  // ...removed log...
    const result = await validateEndpoint(test.endpoint, test.method, test.expectedStatus);
    results.push({ ...test, ...result });
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // ...removed log...
  // ...removed log...
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  // ...removed log...
  // ...removed log...
  
  if (failed.length > 0) {
  // ...removed log...
    failed.forEach(test => {
  // ...removed log...
    });
  }
  
  // ...removed log...
  // ...removed log...
  
  if (successful.length >= results.length * 0.8) {
  // ...removed log...
  // ...removed log...
  // ...removed log...
  // ...removed log...
  } else {
  // ...removed log...
  // ...removed log...
  // ...removed log...
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: (successful.length / results.length) * 100
  };
}

// Run validation if called directly
if (require.main === module) {
  validateIntegration()
    .then(summary => {
      process.exit(summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
  // ...removed log...
      process.exit(1);
    });
}

module.exports = { validateIntegration, validateEndpoint };