# Feature Control System - Complete Guide

## Overview
The feature control system allows **granular control** of what functionality different users can access. It uses a **three-tier hierarchy** to determine if a feature is enabled:

1. **Default Features** - Base features in `kisaan_features` table
2. **Plan Features** - Shop plan overrides in `kisaan_plan_features` table  
3. **User Feature Overrides** - Individual user settings in `kisaan_user_feature_overrides` table

---

## How Feature Resolution Works

### Priority Order (Highest to Lowest)
```
User Override → Plan Feature → Default Feature
```

**Example:**
- Default: `ledger.export` = disabled
- Plan: `ledger.export` = enabled (for Premium plan)
- User Override: `ledger.export` = disabled (for specific user)
- **Result:** User CANNOT use ledger.export (override takes precedence)

---

## For Different Roles

### **Farmer Role**
Farmers are associated with a shop via `shop_id` field. Their features depend on:

1. **Default Features** - Base access to core features
2. **Shop Plan** - The plan their shop is subscribed to determines feature set
3. **User Override** - Superadmin can override for individual farmers

**Example Default Features for Farmers:**
- ✅ `ledger.view` - View their own ledger
- ❌ `ledger.export` - Export ledger (might be premium)
- ❌ `ledger.print` - Print ledger (might be premium)
- ✅ `transactions.view` - View transactions
- ❌ `reports.generate` - Generate reports (plan-dependent)

**When Disabled:**
- Backend rejects API calls with 403 Forbidden error
- Frontend should hide UI for disabled features
- Feature check happens in `loadFeatures` middleware before route handler

---

### **Owner Role**
Owners have elevated access and own a shop. Their features also depend on:

1. **Default Features** - Usually more features enabled than farmers
2. **Shop Plan** - Determines feature set (usually higher tier plan)
3. **User Override** - Can be overridden by superadmin

**Example Default Features for Owners:**
- ✅ `ledger.view` - View shop ledger
- ✅ `ledger.export` - Export ledger
- ✅ `ledger.print` - Print ledger
- ✅ `transactions.view` - View all transactions
- ✅ `reports.generate` - Generate reports
- ✅ `settlements.view` - View settlements
- ✅ `expense.manage` - Manage expenses

**Retention Policy:**
- By default: Can see 7 days of history
- With `transactions.history.full` or `data.retention.unlimited`: Can see 365 days of history
- Owners/Superadmins bypass retention clamping (see full history)

---

### **Buyer Role**
Limited features, typically for viewing their own transactions and balances.

**Example Default Features for Buyers:**
- ✅ `balance.view` - View own balance
- ✅ `transactions.view` - View own transactions
- ❌ `ledger.view` - Cannot view shop ledger
- ❌ `reports.generate` - Cannot generate reports

---

### **Employee Role**
Role-based features depending on shop role.

**Example Default Features for Employees:**
- ✅ `transactions.view` - View transactions
- ❌ `settlements.manage` - Cannot manage settlements
- ❌ `expense.manage` - Cannot manage expenses

---

### **Superadmin Role**
Full access to everything. Cannot have features disabled (checks bypass for superadmin).

---

## What Happens When Features Are Enabled/Disabled

### **When Feature is ENABLED:**
```
✅ Backend `loadFeatures` middleware loads it into req.features
✅ `requireFeature()` middleware allows access (calls next())
✅ Route handler executes normally
✅ Frontend shows UI elements for the feature
```

### **When Feature is DISABLED:**
```
❌ Backend `loadFeatures` middleware loads it as false
❌ `requireFeature()` middleware blocks with 403 Forbidden
❌ Route handler never executes
❌ Response: { code: "ACCESS_DENIED", message: "Feature 'X' not enabled" }
❌ Frontend should hide UI elements for the feature
```

---

## Feature Enforcement Points

### **1. Backend Enforcement (Mandatory)**
The `requireFeature()` middleware blocks API calls:

```typescript
// In routes - blocks unauthenticated/unauthorized access
router.get('/ledger/export', 
  authenticateToken,           // User must be logged in
  loadFeatures,                // Load their effective features
  requireFeature('ledger.export'),  // BLOCKS if feature disabled
  exportLedger                 // Handler only runs if feature enabled
);
```

**Error Response (403):**
```json
{
  "success": false,
  "code": "ACCESS_DENIED",
  "message": "Feature 'ledger.export' not enabled"
}
```

### **2. Frontend Enforcement (Best Practice)**
Frontend should also hide features to improve UX:

```typescript
const features = req.features?.features || {};

if (!features['ledger.export']) {
  // Hide export button
  return null; // Don't render component
}
```

---

## Feature Categories & Examples

### **Ledger Features**
- `ledger.view` - View ledger
- `ledger.export` - Export ledger to CSV/PDF
- `ledger.print` - Print ledger
- `ledger.edit` - Edit ledger entries

### **Transaction Features**
- `transactions.view` - View transactions
- `transactions.create` - Create new transactions
- `transactions.edit` - Edit transactions
- `transactions.history.full` - Access full history (not just 7 days)

### **Report Features**
- `reports.generate` - Generate reports
- `reports.download` - Download generated reports

### **Settlement Features**
- `settlements.view` - View settlements
- `settlements.manage` - Create/edit settlements

### **Admin Features**
- `expense.manage` - Manage expenses
- `users.manage` - Manage users
- `shop.config` - Configure shop settings

---

## How to Enable/Disable Features for a User

### **Via Superadmin Dashboard:**
1. Go to Feature Management page
2. Search for user (farmer/owner/buyer/employee)
3. Click user to select
4. See their effective features (from defaults + plan + overrides)
5. Toggle switches to create/remove overrides
6. Backend saves to `kisaan_user_feature_overrides` table

### **Via API (Superadmin Only):**
```bash
# Enable feature for user
POST /api/features-admin/users/{userId}/override
{
  "feature_code": "ledger.export",
  "enabled": true,
  "reason": "Granted premium access"
}

# Disable feature for user  
DELETE /api/features-admin/users/{userId}/override/{feature_code}
```

### **Via Database:**
```sql
-- Give farmer (user_id=25) full history access
INSERT INTO kisaan_user_feature_overrides (user_id, feature_code, enabled)
VALUES (25, 'transactions.history.full', true);

-- Remove the override (falls back to plan/default)
DELETE FROM kisaan_user_feature_overrides 
WHERE user_id = 25 AND feature_code = 'transactions.history.full';
```

---

## Feature Resolution Algorithm

```javascript
function getEffectiveFeatures(userId) {
  // 1. Load all features and their defaults
  const base = {}; // { 'ledger.view': true, 'ledger.export': false, ... }
  
  // 2. Load user's shop plan features (overrides defaults)
  const planFeatures = user.shop?.plan?.features || {};
  base = { ...base, ...planFeatures };
  
  // 3. Load user-specific overrides (highest priority)
  const userOverrides = await getUserFeatureOverrides(userId);
  userOverrides.forEach(override => {
    base[override.feature_code] = override.enabled;
  });
  
  // 4. Compute retention policy
  if (base['transactions.history.full'] || base['data.retention.unlimited']) {
    retentionDays = 3650; // 10 years
  } else {
    retentionDays = 7; // 1 week
  }
  
  return {
    features: base,           // { 'ledger.view': true, ... }
    retentionDays,
    source: { plan, overrides, defaults }
  };
}
```

---

## Caching Strategy

Features are cached **in-memory for 30 seconds** per user to reduce database queries:

```javascript
const CACHE_MS = 30_000; // 30 seconds

if (cached && (now - cached.ts) < CACHE_MS) {
  req.features = cached.data; // Use cached features
  return next();
}

// Fetch from database if cache expired or miss
const data = await FeatureService.getEffectiveFeatures(userId);
global.__featureCache.set(userId, { ts: now, data });
```

**Cache invalidation happens after:**
- 30 seconds (automatic)
- User override changes (should clear cache)
- Shop plan changes (should clear cache)

---

## Current Limitations & Improvements Needed

### **⚠️ Issues:**
1. **Frontend feature hiding** - Not fully implemented
   - Features are only checked on backend
   - Frontend should hide UI for disabled features
   - Need to fetch user features endpoint

2. **Cache invalidation** - Not automatic
   - When superadmin changes user override, cache isn't cleared
   - User might not see changes for up to 30 seconds
   - Need event-based invalidation

3. **Feature documentation** - Not centralized
   - Which features exist?
   - What do they control?
   - Who gets them by default?

4. **Audit logging** - Missing
   - No log of who disabled/enabled features
   - No history of feature changes
   - No reason tracking

---

## Next Steps to Improve

### **1. Frontend Feature Display**
```typescript
// In SuperadminDashboard.tsx - Add this section
const userFeatures = await featureAdminApi.getUserFeatures(userId);
// Show: features enabled by default vs plan vs override
```

### **2. Real-time Cache Invalidation**
```typescript
// When override is created/deleted
import { io } from 'socket.io';
socket.emit('user-features-changed', { userId });
// Backend clears cache: global.__featureCache.delete(userId);
```

### **3. Feature Management UI**
- Show current feature state (from which source: default/plan/override)
- Add reason field for overrides
- Show feature impact (what breaks if disabled)

### **4. Audit Trail**
- Log all feature changes in `audit_logs` table
- Track who changed what and when
- Show in superadmin dashboard

---

## Testing Feature Control

### **Test: Farmer with disabled export**
```
1. Login as superadmin
2. Override farmer (user_id=25) with ledger.export = false
3. Login as farmer (id=25)
4. Try to access /ledger/export
5. Expected: 403 Forbidden with "Feature not enabled"
```

### **Test: Owner bypasses retention**
```
1. Owner tries to view transactions from 2023
2. Default retention = 7 days (fails)
3. Superadmin enables 'transactions.history.full'
4. Owner tries again
5. Expected: Success, can see 2023 data
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Control Level** | Per-user, per-feature granular control |
| **Resolution** | User Override > Plan Features > Defaults |
| **Enforcement** | Backend mandatory, frontend recommended |
| **Caching** | 30 seconds in-memory per user |
| **Roles Affected** | All except Superadmin (always full access) |
| **Error Handling** | 403 Forbidden when feature disabled |
| **UI Impact** | Should hide disabled features from user view |
