# Simple Ledger 401 Unauthorized Fix

## Issues Fixed

### 1. **Authentication Error (401 Unauthorized)**
**Problem:** The `/api/simple-ledger?shop_id=1` endpoint was returning 401 Unauthorized.

**Root Cause:** 
- The route was using a dummy `authMiddleware` that expected `req.user` to already be set
- No actual JWT token validation was being performed
- The `authMiddleware` was checking for an empty/undefined user and rejecting requests

**Solution:**
- Replaced the dummy `authMiddleware` with the proper `authenticateToken` middleware from `middlewares/auth.ts`
- This middleware now:
  - Extracts the JWT token from the `Authorization: Bearer <token>` header
  - Verifies the token using JWT secret
  - Fetches user data from the database once globally
  - Attaches user to `req.user` for downstream handlers

**File Changed:** `src/routes/simpleFarmerLedgerRoutes.ts`

### 2. **Owner Access Control**
**Problem:** Owners couldn't access the simple-ledger endpoint because the access guards were too restrictive.

**Root Cause:**
- The original `shopAccessGuard` and `farmerReadOnlyGuard` had faulty role checking logic
- They referenced a non-existent `USER_ROLES` constant
- Role checks didn't properly support owner/employee access patterns

**Solution:**
- Updated access guards to properly support:
  - **Owners/Employees:** Have full access to ledger operations (GET, POST, PUT, DELETE)
  - **Farmers:** Can only read their own ledger data via GET requests
- Guards now use string role comparisons ('owner', 'employee', 'farmer')
- Owners must belong to the requested shop_id

**File Changed:** `src/middleware/accessGuards.ts`

### 3. **Global User Fetching**
**Problem:** Request indicated users should be fetched globally, not per component.

**Solution:**
- The `authenticateToken` middleware already implements global user fetching
- User is fetched once from the database per request and attached to `req.user`
- All downstream handlers (controllers, guards) access the same user instance
- No per-component fetching needed

**How It Works:**
```
Request → authenticateToken (fetches user once) → req.user set → 
Access Guards → Controllers (use req.user)
```

## Request/Response Flow

### Frontend (sends request)
```typescript
// simpleLedger/api.ts
const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
fetch('/api/simple-ledger?shop_id=1', {
  headers: {
    'Authorization': `Bearer ${token}`  // ← Critical header
  }
});
```

### Backend (processes request)
1. **authenticateToken** middleware:
   - Extracts token from Authorization header
   - Verifies JWT signature
   - Fetches user from DB (global fetch)
   - Sets `req.user`

2. **farmerReadOnlyGuard** (for GET /api/simple-ledger):
   - Owner/Employee: ✅ Full access
   - Farmer: ✅ Only read their own data
   - Others: ❌ 401 Unauthorized

3. **listEntries** controller:
   - Uses `req.user` (already fetched)
   - Returns ledger data

## Testing Checklist

- [ ] Make sure you have a valid JWT token (log in to get one)
- [ ] Token should be stored in localStorage as `auth_token` or `token`
- [ ] Owner should be able to GET `/api/simple-ledger?shop_id=1` (returns 200)
- [ ] Owner should be able to POST/PUT/DELETE ledger entries (returns 201/200/200)
- [ ] Farmer should be able to GET their own ledger (returns 200)
- [ ] Farmer should NOT be able to access other farmer's ledger (returns 403)
- [ ] Unauthenticated requests should return 401

## Configuration Details

**JWT Configuration:**
- Secret Key: From `process.env.JWT_SECRET` or defaults to 'supersecret'
- Validated in `src/middlewares/auth.ts`

**User Context:**
- Attached to `req.user` in `AuthenticatedRequest` interface
- Properties: `id`, `username`, `role`, `shop_id`
- Available to all downstream handlers without refetching
