# KisaanCenter Frontend: Data Management Optimization Plan

## 🚨 Critical Issues Identified

### **Issue 1: User Data Fetching Chaos**
**Current State**: 6+ components independently fetch the same user data using `usersApi.getAll()`

**Pages Affected**:
- TransactionManagement.tsx
- BalanceManagement.tsx  
- PaymentManagement.tsx
- CreditAdvanceManagement.tsx
- SuperadminShops.tsx
- Reports.tsx (partial)

**Problem**: Each component maintains its own user state, leading to:
- Multiple API calls for identical data
- Inconsistent user information across views
- Performance degradation
- Stale data issues when users are updated

### **Issue 2: Mixed Data Management Patterns**
**Current State**: Three different data management approaches used inconsistently:

1. **React Context** (`UsersContext`) - Used in some places
2. **Zustand Store** (`useTransactionStore`) - Partially adopted
3. **Manual useState** - Most common, scattered everywhere

### **Issue 3: No Data Invalidation Strategy**
**Current State**: When data changes in one view, other views don't automatically update

## 🎯 Recommended Solutions

### **Solution 1: Implement React Query for Global Data Management**

**Why React Query?**
- Automatic caching and background refetching
- Built-in loading and error states
- Automatic data invalidation and updates
- Better performance with stale-while-revalidate pattern

**Implementation Plan**:

#### **Step 1: Install and Setup React Query**
```bash
npm install @tanstack/react-query
```

#### **Step 2: Create Centralized Data Hooks**

**Create `src/hooks/useShopData.ts`**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, transactionsApi, paymentsApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Query Keys
export const SHOP_QUERY_KEYS = {
  users: (shopId: string) => ['shop', shopId, 'users'],
  transactions: (shopId: string, dateRange?: string) => 
    ['shop', shopId, 'transactions', dateRange],
  payments: (shopId: string) => ['shop', shopId, 'payments'],
  balance: (shopId: string) => ['shop', shopId, 'balance'],
} as const;

// Centralized Shop Users Hook
export function useShopUsers(shopId?: string | number) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  return useQuery({
    queryKey: SHOP_QUERY_KEYS.users(String(actualShopId)),
    queryFn: () => usersApi.getAll({ shop_id: actualShopId }),
    enabled: !!actualShopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Centralized Shop Transactions Hook
export function useShopTransactions(shopId?: string | number, dateRange?: string) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  return useQuery({
    queryKey: SHOP_QUERY_KEYS.transactions(String(actualShopId), dateRange),
    queryFn: () => transactionsApi.getAll({ shop_id: actualShopId, ...parseDateRange(dateRange) }),
    enabled: !!actualShopId,
    staleTime: 2 * 60 * 1000, // 2 minutes for transactions
  });
}

// User Mutations with Automatic Invalidation
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      // Invalidate all user queries for this shop
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.users(String(user?.shop_id))
      });
    },
  });
}
```

#### **Step 3: Refactor Components to Use Centralized Hooks**

**Before (TransactionManagement.tsx)**:
```typescript
// OLD - Each component fetches independently
const [users, setUsers] = useState([]);
const fetchUsers = async () => {
  const response = await usersApi.getAll({ shop_id: user.shop_id });
  setUsers(response.data);
};
useEffect(() => { fetchUsers(); }, []);
```

**After (TransactionManagement.tsx)**:
```typescript
// NEW - Use centralized hook
import { useShopUsers } from '@/hooks/useShopData';

const TransactionManagement = () => {
  const { data: users = [], isLoading: usersLoading } = useShopUsers();
  // Remove all manual user fetching logic
  // Users are now automatically cached and shared
}
```

### **Solution 2: Create Smart Component Patterns**

#### **Create `src/hooks/useSmartTransactions.ts`**:
```typescript
export function useSmartTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const shopId = user?.shop_id;
  
  // Get cached users first
  const { data: users = [] } = useShopUsers(shopId);
  
  // Get transactions with automatic user enrichment
  const { data: rawTransactions, ...transactionQuery } = useShopTransactions(shopId);
  
  // Enrich transactions with user data from cache
  const enrichedTransactions = useMemo(() => {
    return rawTransactions?.map(txn => ({
      ...txn,
      buyer_name: users.find(u => u.id === txn.buyer_id)?.username,
      farmer_name: users.find(u => u.id === txn.farmer_id)?.username,
    })) || [];
  }, [rawTransactions, users]);
  
  return {
    transactions: enrichedTransactions,
    users,
    ...transactionQuery
  };
}
```

### **Solution 3: Eliminate Store Inconsistencies**

#### **Option A: Migrate Everything to React Query (Recommended)**
- Remove Zustand `useTransactionStore`
- Replace all manual state with React Query
- Use React Query's built-in optimistic updates

#### **Option B: Enhance Zustand Store (Alternative)**
- Extend `useTransactionStore` to handle all shop data
- Add automatic invalidation logic
- Create selectors for different data slices

### **Solution 4: Implement Data Invalidation Strategy**

```typescript
// Create src/hooks/useDataInvalidation.ts
export function useDataInvalidation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return {
    invalidateShopData: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId)
      });
    },
    
    invalidateUsers: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.users(String(targetShopId))
      });
    }
  };
}
```

## 📋 Implementation Roadmap

### **Phase 1 (Week 1): Foundation**
1. ✅ Install React Query and setup QueryClient
2. ✅ Create `useShopUsers` hook
3. ✅ Refactor 2-3 high-impact components (TransactionManagement, BalanceManagement)
4. ✅ Test data sharing between components

### **Phase 2 (Week 2): Expand Coverage**
1. ✅ Create `useShopTransactions` and `useShopPayments` hooks
2. ✅ Refactor remaining owner components
3. ✅ Add mutation hooks with invalidation
4. ✅ Remove manual API calls from components

### **Phase 3 (Week 3): Optimize & Clean**
1. ✅ Add loading states and error handling
2. ✅ Remove unused Zustand store code
3. ✅ Add optimistic updates for mutations
4. ✅ Performance testing and optimization

### **Phase 4 (Week 4): Extend to Superadmin**
1. ✅ Apply same patterns to Superadmin components
2. ✅ Create role-specific data hooks
3. ✅ Final cleanup and documentation

## 🔧 Quick Wins (Can Implement Today)

### **Quick Win 1: Share Users Across Balance and Transaction Pages**

**Create temporary hook in `src/hooks/useSharedUsers.ts`**:
```typescript
import { create } from 'zustand';

interface SharedUsersState {
  usersByShop: Record<string, User[]>;
  setUsers: (shopId: string, users: User[]) => void;
  getUsers: (shopId: string) => User[];
}

const useSharedUsers = create<SharedUsersState>((set, get) => ({
  usersByShop: {},
  setUsers: (shopId, users) => 
    set(state => ({ 
      usersByShop: { ...state.usersByShop, [shopId]: users } 
    })),
  getUsers: (shopId) => get().usersByShop[shopId] || [],
}));

export { useSharedUsers };
```

### **Quick Win 2: Add Loading Coordination**

**Create `src/hooks/useCoordinatedLoading.ts`**:
```typescript
import { create } from 'zustand';

interface LoadingState {
  loading: Record<string, boolean>;
  setLoading: (key: string, isLoading: boolean) => void;
  isAnyLoading: () => boolean;
}

export const useCoordinatedLoading = create<LoadingState>((set, get) => ({
  loading: {},
  setLoading: (key, isLoading) =>
    set(state => ({ 
      loading: { ...state.loading, [key]: isLoading } 
    })),
  isAnyLoading: () => Object.values(get().loading).some(Boolean),
}));
```

## 📊 Expected Impact

### **Performance Improvements**:
- **Before**: 6+ API calls for same user data across views
- **After**: 1 API call with automatic caching and sharing
- **Result**: ~80% reduction in unnecessary network requests

### **Developer Experience**:
- **Before**: Each component manages its own loading/error states
- **After**: Centralized data management with consistent patterns
- **Result**: Less boilerplate code, fewer bugs

### **User Experience**:
- **Before**: Inconsistent data, loading states vary per view
- **After**: Consistent data across all views, optimistic updates
- **Result**: Smoother, more responsive application

## 🚦 Risk Assessment

### **Low Risk Changes**:
- Adding React Query hooks alongside existing code
- Creating shared user state without removing existing code
- Adding data invalidation helpers

### **Medium Risk Changes**:
- Refactoring individual components to use new hooks
- Removing manual state management code
- Updating data flow patterns

### **High Risk Changes**:
- Removing Zustand store entirely
- Changing API response handling patterns
- Modifying core data structures

## 📈 Success Metrics

1. **Network Requests**: Reduce duplicate API calls by 70%+
2. **Code Complexity**: Reduce user-fetching code duplication by 80%+
3. **Data Consistency**: Eliminate stale data across views
4. **Performance**: Improve page load times by 30%+
5. **Developer Velocity**: Reduce time to add new data-dependent features

This plan provides a clear path to eliminate the data duplication issues while maintaining application stability and improving developer experience.