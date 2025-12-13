# Frontend Architecture

## Goals
- Consistency: Single patterns for API access, data shaping, and derived field calculation.
- Predictability: Clear layering so new contributors know where code belongs.
- Explicit Data Flow: From UI intent → service call → normalized response → store (when cached) → presentation.
- Progressive Hardening: Helpers & endpoint constants reduce duplication and future migration risk.

## Guiding Principles
1. Single Source of Truth for endpoints (`src/services/endpoints.ts`).
2. Shared service helpers for query serialization & list normalization (`buildQueryString`, `normalizeListResponse`).
3. Derived fields are always computed in one place (`buildTransactionPayload` + `transactionCalculations`).
4. Keep global state minimal; prefer component/query scoping unless cross-screen reuse or caching is needed.
5. Narrow selectors when reading from the store to minimize re-renders.
6. Pure utilities (no side effects) live under `src/utils` or feature-specific `.../utils` directories.

## Directory/Layers (Representative)
```
src/
  components/            # Generic / cross-feature presentational components
  features/              # Feature slices (e.g., transactions/, reports/, users/)
    transactions/
      components/        # Transaction-focused UI pieces (modular form, tables)
      utils/             # transactionCalculations, mappers
  services/              # API layer (api.ts, apiClient.ts, endpoints.ts, serviceHelpers.ts)
  store/                 # Zustand store(s) with typed slices & selectors
  utils/                 # Shared pure utilities (formatting, payload builders)
  types/                 # Central TypeScript domain models (User, Transaction, Payment ...)
  pages/ (if present)    # Route-level composition (optional depending on framework)
```

## Layer Responsibilities
- components: Render data, invoke callbacks, no knowledge of fetch specifics.
- features: Orchestrate feature flows; compose smaller components; import dedicated utils.
- services: Contain all network logic; build URLs only via constants; shape inputs/outputs.
- store: Cache and aggregate domain slices (transactions by date/shop, users-by-shop); expose selectors.
- utils: Deterministic transformations & calculations (idempotent, reusable, testable).
- helpers (serviceHelpers): Horizontal cross-cutting helpers (query building, response normalization).
- endpoints: String constants and builders; zero runtime logic beyond interpolation.

## Data Flow Example (Transaction Create)
1. UI collects raw form inputs (quantity, unit_price, buyer, farmer, commission_rate, etc.).
2. `transactionsApi.createFromInput` calls `buildTransactionPayload`.
3. Payload builder performs numeric coercion, calculates: total_sale_value, shop_commission, farmer_earning.
4. Service posts to backend using `TRANSACTION_ENDPOINTS.BASE`.
5. Response normalized (if list) or passed through (single entity) and optionally stored.

## State Management Notes
- `transactionStore` groups transactions by shop + date for fast drill-down & pruning.
- Selectors (e.g., `selectTransactionsForShopDates`) isolate consumption & minimize re-render scope.
- Invalidation prunes empty buckets to avoid unbounded growth.

## Helpers
- buildQueryString: Skips undefined/null/empty, supports arrays & Dates.
- normalizeListResponse: Unifies variable backend list shapes to `PaginatedResponse<T>`.
- fetchAndNormalizeList: Convenience promise wrapper (optional usage pattern).

## Patterns & Conventions
- All service list methods should adopt (params → buildQueryString → normalizeListResponse).
- Endpoint constants: Add new builder in `endpoints.ts` before using inline string.
- Derived monetary values always rounded at calculation utility layer—never inline in components.
- Comments with `TODO:` only for transitional or incremental migration tasks and should reference the target pattern.

## Testing & Validation (Planned / Suggested)
- Unit tests for calculation utilities & payload builder.
- Snapshot tests for store pruning logic (invalidate transactions removes empty structures).
- Contract tests (optional) for service layer using mocked fetch.

## Future Improvements
- Introduce hook-based data fetching with cache (e.g., React Query) to complement existing store where beneficial.
- Add ESLint rule or code mod to flag inline route strings starting with `/transactions` not using constants.
- Introduce more granular feature-specific stores if state surface grows.

## Navigation System
We use a **single configuration source** for all navigation surfaces (sidebar, mobile sheet, desktop top bar): `src/config/navigationConfig.ts`.

### Goals
- Eliminate duplication across `Sidebar`, `MobileNav`, `DesktopNav`.
- Provide a typed structure for role-based visibility.
- Enable future feature flags and localization via stable `key` field.

### Shape
```
export interface AppNavItem {
  key: string;               // Stable ID for tests & i18n lookup
  label: string;             // Display text (will become translation key later)
  href: string;              // Route path
  icon?: LucideIcon;         // Optional icon component
  roles: AppRole[];          // Roles that can see this item
  exact?: boolean;           // If true, active only on exact match
  quick?: boolean;           // Eligible for Quick Actions grouping
  order?: number;            // Ordering weight (ascending)
  mobileOnly?: boolean;      // Only render on mobile navigation
  desktopOnly?: boolean;     // Only render on desktop navigation
}
```

### Helpers
- `normalizeRole(role)`: Coerces backend-provided role string to canonical lowercase union.
- `getVisibleNavItems(role, { includeQuick })`: Returns ordered list filtered by role.
- `getQuickActions(role)`: Returns `quick === true` subset for the current role.
- `isActive(path, item)`: Shared active-state logic (supports prefix matching unless `exact`).
- `validateNavConfig()`: Runtime integrity check (duplicate keys, empty fields) used in a test.

### Usage Pattern
Components import only the helpers and never hardcode navigation arrays:
```
const role = normalizeRole(user?.role);
const navigation = getVisibleNavItems(role);
```

### Quick Actions
Defined via `quick: true` flag—currently used by mobile nav for prominent actions (e.g., Sales). Can expand to in-dashboard shortcuts.

### Extending
1. Add new item to `NAV_ITEMS` with unique `key` and `order`.
2. If adding a new role or feature gate, extend `AppRole` union and optionally add `featureFlag` (future enhancement).
3. Run tests (will fail if duplicate key exists).

### Future Enhancements
- Add `featureFlag` and `category` fields for grouping.
- Introduce i18n by mapping `key` to translation resource.
- Auto-generate sitemap or role-based menus for docs.

### Anti-Patterns
- Duplicating arrays inside components.
- Inline route strings for existing nav items.
- Role name case inconsistency—always normalize before filtering.

## Quick Reference
- Endpoints: `services/endpoints.ts`
- Service Helpers: `services/serviceHelpers.ts`
- Transaction Calculations: `features/transactions/utils/transactionCalculations.ts`
- Payload Builder: `utils/buildTransactionPayload.ts`
- Store: `store/transactionStore.ts`

