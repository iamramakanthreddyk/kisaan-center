# 🔧 Frontend-Backend API Alignment Fixes

## Critical Issues Found & Solutions

### 1. **Credit Advance Routes Missing**

**Problem**: Frontend expects `/api/credit-advances` but backend doesn't have this route registered.

**Solution**: Add credit advance routes to backend API registry or remove from frontend if not needed.

### 2. **Balance API Endpoints Mismatch**

**Problem**: 
- Frontend: `/balance/user/:id`, `/balance/shop/:id`, `/balance/update`
- Backend pattern: `/api/balances/*`

**Solution**: Update frontend endpoints to include proper `/api` prefix.

### 3. **Transaction Analytics Missing**

**Problem**: Frontend expects `/api/transactions/analytics` but backend doesn't have this endpoint.

**Solution**: Either implement analytics endpoint in backend or remove from frontend.

### 4. **Inconsistent Payment Endpoints**

**Problem**: Some payment endpoints in frontend don't match backend structure.

**Solution**: Align payment endpoint patterns.

## Updated Frontend Endpoints

### Fixed Balance Endpoints
```typescript
export const BALANCE_ENDPOINTS = {
  BASE: '/balances',
  USER: (id: Id) => `/balances/user/${id}`,     // Fixed: was /balance/user/
  SHOP: (id: Id) => `/balances/shop/${id}`,     // Fixed: was /balance/shop/
  UPDATE: '/balances/update',                    // Fixed: was /balance/update
  SNAPSHOTS: '/balance-snapshots',
  SNAPSHOTS_BY_USER: (id: Id) => `/balance-snapshots/user/${id}`  // More specific
} as const;
```

### Fixed Transaction Endpoints
```typescript
export const TRANSACTION_ENDPOINTS = {
  BASE: '/transactions',
  BY_ID: (id: Id) => `/transactions/${id}`,
  BY_SHOP_LIST: (shopId: Id) => `/transactions?shop_id=${shopId}`,              // Fixed: use query params
  BY_FARMER_LIST: (farmerId: Id) => `/transactions?farmer_id=${farmerId}`,      // Fixed: use query params  
  BY_BUYER_LIST: (buyerId: Id) => `/transactions?buyer_id=${buyerId}`,          // Fixed: use query params
  SHOP_EARNINGS: (shopId: Id) => `/transactions/shop/${shopId}/earnings`,       // Keep if backend supports
  FARMER_EARNINGS: (farmerId: Id) => `/transactions/farmer/${farmerId}/earnings`,
  BUYER_PURCHASES: (buyerId: Id) => `/transactions/buyer/${buyerId}/purchases`,
  QUICK: '/transactions/quick'  // Backend supports this
} as const;
```

### Payment Endpoints Alignment
```typescript
export const PAYMENT_ENDPOINTS = {
  BASE: '/payments',
  BULK: '/payments/bulk',
  BY_ID: (id: Id) => `/payments/${id}`,
  STATUS: (id: Id) => `/payments/${id}/status`,
  BY_TRANSACTION: (transactionId: Id) => `/payments/transaction/${transactionId}`,
  OUTSTANDING: '/payments/outstanding',
  FARMER: (farmerId: Id) => `/payments/farmers/${farmerId}`,
  BUYER: (buyerId: Id) => `/payments/buyers/${buyerId}`
} as const;
```

## Required Backend Routes to Add/Verify

### 1. Credit Advance Routes (if needed)
```typescript
// src/routes/creditAdvanceRoutes.ts
router.get('/', getAllCreditAdvances);
router.post('/', createCreditAdvance);
router.get('/:id', getCreditAdvanceById);
router.put('/:id', updateCreditAdvance);
router.delete('/:id', deleteCreditAdvance);
```

### 2. Transaction Analytics Endpoint
```typescript
// Add to transactionRoutes.ts
router.get('/analytics', authenticateToken, getTransactionAnalytics);
```

### 3. Balance Update Endpoint
```typescript
// Verify in balanceRoutes.ts
router.put('/update', authenticateToken, updateBalance);
```

## Verification Checklist

- [ ] All frontend endpoints have matching backend routes
- [ ] API prefixes are consistent (`/api/...`)
- [ ] Query parameter patterns match backend expectations
- [ ] Authentication middleware is properly applied
- [ ] Response formats are consistent between frontend and backend
- [ ] Error handling follows the same patterns

## Testing Strategy

1. **API Discovery**: Use backend's `/api/test` endpoint to see all available routes
2. **Endpoint Testing**: Test each frontend API call against backend
3. **Response Validation**: Ensure response formats match frontend expectations
4. **Error Handling**: Test error scenarios and response formats

## Implementation Priority

1. **HIGH**: Fix balance endpoints (critical for user experience)
2. **HIGH**: Align transaction query patterns  
3. **MEDIUM**: Add missing analytics endpoints
4. **LOW**: Credit advance routes (if not actively used)

This alignment will ensure your frontend and backend communicate properly without API mismatches.