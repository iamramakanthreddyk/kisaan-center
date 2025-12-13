# KisaanCenter API Specification

**Base URL:** `/api/v1`

---

## User Management
- `POST /users/` — Create user
- `GET /users/{user_id}` — Get user by ID
- `GET /users/` — List users (paginated)
- `PUT /users/{user_id}` — Update user
- `POST /users/auth/login` — User authentication
- `GET /users/shop/{shop_id}` — Users by shop
- `PUT /users/{user_id}/credit-limit` — Update credit limit

## Shop Management
- `GET /shops/{shop_id}` — Get shop by ID
- `GET /shops/` — List shops (paginated)
- `POST /shops/` — Create shop
- `PUT /shops/{shop_id}` — Update shop

## Product Management
- `GET /products/{product_id}` — Get product by ID
- `GET /products/` — List products (paginated)
- `POST /products/` — Create product
- `PUT /products/{product_id}` — Update product

## Transaction Management
- `POST /transactions/` — Create transaction
- `GET /transactions/{transaction_id}` — Get transaction
- `GET /transactions/` — List transactions (paginated, filtered)
- `PUT /transactions/{transaction_id}` — Update transaction
- `PUT /transactions/{transaction_id}/confirm-commission` — Confirm commission
- `GET /transactions/shop/{shop_id}/dashboard` — Shop dashboard metrics
- `GET /transactions/{transaction_id}/summary` — Financial summary

## Stock Management
- `GET /farmer-stock/` — List farmer stock (paginated, filtered)
- `POST /farmer-stock/` — Add farmer stock
- `PUT /farmer-stock/{stock_id}` — Update farmer stock
- `GET /farmer-stock/status/{shop_id}` — Real-time stock status
- `GET /farmer-stock/farmer/{farmer_id}` — Farmer stock summary

## Payment Management
- `GET /payments/` — List payments (paginated)
- `POST /payments/` — Create payment
- `GET /payments/{payment_id}` — Get payment by ID

## Credit Management
- `GET /credits/` — List credits (paginated)
- `POST /credits/` — Create credit
- `GET /credits/{credit_id}` — Get credit by ID

## Subscription Management
- `GET /subscriptions/plans` — Get all subscription plans
- `GET /subscriptions/shop/{shop_id}` — Get shop subscription
- `GET /subscriptions/shop/{shop_id}/limits/farmers` — Check farmer creation limits
- `GET /subscriptions/health` — Subscription health check

## Health & Info
- `GET /` — Root health check
- `GET /health` — Detailed health check
- `GET /info` — API information

## Dashboards
- `GET /dashboard/shop/{shop_id}` — Owner dashboard
- `GET /dashboard/shop/{shop_id}/summary` — Shop dashboard summary
- `GET /dashboard/owner` — Owner dashboard
- `GET /dashboard/farmer` — Farmer dashboard
- `GET /dashboard/buyer` — Buyer dashboard
- `GET /dashboard/employee` — Employee dashboard

---

## Superadmin Endpoints

All endpoints below require the user to have `role='superadmin'`.
Base URL: `/api/v1/admin`

- `PUT /shops/{shop_id}/plan-overrides` — Create shop-specific plan overrides
- `GET /shops/{shop_id}/overrides` — Get all active overrides for a shop
- `DELETE /shops/{shop_id}/overrides/{feature_name}` — Remove a specific override for a shop
- `POST /shops` — Create a new shop
- `POST /shops/{shop_id}/users` — Add users to a shop
- `POST /shops/{shop_id}/products` — Assign products to a shop
- `POST /shops/{shop_id}/activate` — Activate a shop
- `PUT /shops/{shop_id}/status` — Enable/disable shop and optionally all its users
- `POST /users/{user_id}/force-password-reset` — Force password reset for a user
- `POST /bulk/plan-changes` — Apply plan changes to multiple shops
- `POST /bulk/shop-status` — Bulk update shop status
- `GET /shops/{shop_id}/analytics` — Shop analytics and insights
- `GET /analytics/risk-assessment` — Risk assessment analytics
- `GET /analytics/revenue-impact` — Revenue impact analytics
- `GET /protection/validate-overrides` — Validate protection overrides
- `GET /protection/business-rules` — Get business rules
- `GET /health` — Superadmin service health check

**Request/Response Models:**
See backend schemas for details (e.g., `ShopCreateRequest`, `UserCreateRequest`, `ProductAssignRequest`, `PlanOverrideRequest`, `ShopStatusRequest`, `PasswordResetRequest`, `BulkChangesRequest`, `OverrideResponse`, `ShopStatusResponse`, `PasswordResetResponse`).

---

**Note:** For request/response details, see your backend schemas and frontend integration guide.
