#!/usr/bin/env node

/**
 * API COVERAGE ANALYSIS SCRIPT
 * Analyzes what APIs exist vs what validation covers
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 API COVERAGE ANALYSIS\n');

// Read the validation script to see what it tests
const validationScript = fs.readFileSync(path.join(__dirname, 'comprehensive-validation.js'), 'utf8');

// Extract tested endpoints from validation script
const testedEndpoints = [];
const logResultMatches = validationScript.match(/logResult\(['"]([^'"]+)['"]/g);
if (logResultMatches) {
  logResultMatches.forEach(match => {
    const endpointMatch = match.match(/logResult\(['"]([^'"]+)['"]/);
    if (endpointMatch && endpointMatch[1].startsWith('GET ') || endpointMatch[1].startsWith('POST ') || endpointMatch[1].startsWith('PUT ') || endpointMatch[1].startsWith('DELETE ') || endpointMatch[1].startsWith('PATCH ')) {
      testedEndpoints.push(endpointMatch[1]);
    }
  });
}

// Also extract from makeRequest calls for more comprehensive coverage
const endpointMatches = validationScript.match(/makeRequest\(['"](GET|POST|PUT|DELETE|PATCH)['"],\s*['"]([^'"]+)['"]/g);
if (endpointMatches) {
  endpointMatches.forEach(match => {
    const parts = match.match(/makeRequest\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/);
    if (parts) {
      let endpoint = `${parts[1]} ${parts[2]}`;
      // Normalize dynamic endpoints
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:id');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:userId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:shopId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:transactionId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:farmerId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:buyerId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:productId');
      endpoint = endpoint.replace(/\/\$\{[^}]+\}/g, '/:categoryId');

      if (!testedEndpoints.includes(endpoint)) {
        testedEndpoints.push(endpoint);
      }
    }
  });
}

// Known API endpoints from route analysis
const knownEndpoints = [
  // Authentication
  'POST /auth/login',
  'POST /auth/register',

  // Users
  'GET /users',
  'POST /users',
  'GET /users/me',
  'GET /users/:id',
  'PUT /users/:id',
  'DELETE /users/:id',
  'POST /users/:id/reset-password',
  'POST /users/:id/admin-reset-password',
  'PATCH /users/:id/commission',

  // Shops
  'GET /shops',
  'POST /shops',
  'GET /shops/:id',
  'PUT /shops/:id',
  'DELETE /shops/:id',
  'GET /shops/:id/products',

  // Categories
  'GET /categories',
  'GET /categories/:id',

  // Products
  'GET /products',
  'GET /products/:id',
  'POST /products',
  'PUT /products/:id',
  'DELETE /products/:id',

  // Transactions
  'GET /transactions',
  'POST /transactions',
  'GET /transactions/:id',
  'PUT /transactions/:id',

  // Payments
  'GET /payments',
  'POST /payments',
  'POST /payments/bulk',
  'PUT /payments/:id/status',
  'GET /payments/transaction/:transactionId',
  'GET /payments/outstanding',
  'GET /payments/farmers/:farmerId',
  'GET /payments/buyers/:buyerId',

  // Balances
  'GET /balances/user/:userId',
  'GET /balances/shop/:shopId',
  'POST /balances/payment/farmer',
  'POST /balances/payment/buyer',
  'POST /balances/update',
  'GET /balances/history/:userId',

  // Commissions
  'GET /commissions',
  'POST /commissions',
  'GET /commissions/shop/:shopId',
  'POST /commissions/calculate',

  // Simplified API
  'GET /simple/test',
  'POST /simple/transaction',
  'POST /simple/payment',
  'POST /simple/expense',
  'GET /simple/balance/:userId',

  // Reports
  'GET /reports',

  // Settlements
  'GET /settlements',
  'POST /settlements',

  // Credits
  'GET /credits',
  'POST /credits',

  // Audit Logs
  'GET /audit-logs',

  // System
  'GET /health',
  'GET /api/test'
];

console.log('📋 KNOWN API ENDPOINTS:');
knownEndpoints.forEach(endpoint => console.log(`   ${endpoint}`));

console.log('\n🧪 TESTED ENDPOINTS:');
// Remove duplicates and sort
const uniqueTestedEndpoints = [...new Set(testedEndpoints)].sort();
uniqueTestedEndpoints.forEach(endpoint => console.log(`   ${endpoint}`));

// Find missing coverage
const missingEndpoints = knownEndpoints.filter(endpoint => {
  // Check if this endpoint pattern is tested
  return !uniqueTestedEndpoints.some(tested => {
    const [method1, path1] = endpoint.split(' ');
    const [method2, path2] = tested.split(' ');

    // Exact match
    if (endpoint === tested) return true;

    // Pattern match (ignore IDs)
    const path1Normalized = path1.replace(/:\w+/g, ':id');
    const path2Normalized = path2.replace(/:\w+/g, ':id');

    return method1 === method2 && path1Normalized === path2Normalized;
  });
});

console.log('\n❌ MISSING COVERAGE:');
missingEndpoints.forEach(endpoint => console.log(`   ${endpoint}`));

console.log(`\n📊 COVERAGE SUMMARY:`);
console.log(`   Total Known Endpoints: ${knownEndpoints.length}`);
console.log(`   Tested Endpoints: ${uniqueTestedEndpoints.length}`);
console.log(`   Missing Coverage: ${missingEndpoints.length}`);
console.log(`   Coverage: ${((uniqueTestedEndpoints.length / knownEndpoints.length) * 100).toFixed(1)}%`);

// Business logic gaps
console.log('\n💼 BUSINESS LOGIC GAPS:');
const businessLogicGaps = [
  'User commission rate overrides (PATCH /users/:id/commission)',
  'Bulk payment processing (POST /payments/bulk)',
  'Payment status updates (PUT /payments/:id/status)',
  'Balance history (GET /balances/history/:userId)',
  'Shop balance queries (GET /balances/shop/:shopId)',
  'Settlement processing (GET/POST /settlements)',
  'Credit advance management (GET/POST /credit-advances)',
  'Manual credits/charges (GET/POST /credits)',
  'Audit logging (GET /audit-logs)',
  'Reporting endpoints (GET /reports)',
  'Product CRUD operations (POST/PUT/DELETE /products)',
  'Transaction CRUD operations (POST/PUT /transactions)',
  'Owner dashboard (GET /owner-dashboard)',
  'Superadmin operations (GET/POST /superadmin)',
  'Feature flags (GET /features-admin)'
];

businessLogicGaps.forEach(gap => console.log(`   • ${gap}`));