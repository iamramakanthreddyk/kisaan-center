# Feature: Superadmin Can Create Owner and Shop

## Overview
This feature enables a superadmin to create both shop owners and shops in the system, ensuring clear separation of responsibilities and avoiding duplication/confusion in implementation.

---

## 1. Create Owner (User with role 'owner')

- **API Route:**
  - `POST /shops/{shop_id}/users` (in `backend/src/api/superadmin.py`)
  - Payload must match `UserCreate` schema, with `role="owner"`

- **Service Logic:**
  - `UserService.add_users_to_shop` (in `backend/src/services/user_service.py`)
    - Delegates to `UserService.create_user` for validation and creation
    - Validates username, password, and role
    - Allows only valid roles (including `owner`)
    - Hashes password
    - Returns APIResponse
- **Schema:**
  - `UserCreate` (in `backend/src/schemas.py`)
    - Properties: `username`, `password`, `role`, `contact`, `shop_id`, `credit_limit`, `created_by`, `status`
- **Model:**
  - `User` (in `backend/src/models/user.py`)
    - Relationship: `shop`

---
## 2. Create Shop

  - `POST /shops` (in `backend/src/api/superadmin.py`)
  - Payload must match `ShopCreate` schema
- **Service Logic:**
  - `ShopService.create_shop` (in `backend/src/services/shop_service.py`)
    - Validates and creates a shop

- **Schema:**
  - `ShopCreate` (in `backend/src/schemas.py`)

- **Model:**
  - `Shop` (in `backend/src/models/shop.py`)
    - Relationship: `users`

---
## 3. Assign Plan to Shop

- **API Route:**
  - Payload must match `PlanOverrideRequest` schema
- **Service Logic:**
    - Validates overrides, analyzes impact, may require approval for high-risk changes
    - Updates feature controls and pricing
- **Schema:**
    - Properties: `overrides`, `reason`, `valid_until`
- **Model:**
- **API Routes:**
  - `PUT /shops/{shop_id}/status` (in `backend/src/api/superadmin.py`)
  - Payload must match `ShopStatusRequest` schema
- **Service Logic:**
  - `ShopService.activate_shop` (in `backend/src/services/shop_service.py`)
    - Activates a shop and assigns a plan
    - Validates shop existence and status
    - Returns APIResponse

---

## Product Category Management & Assignment Journey

### 1. Category Creation
- **Model:** `Category` (`models/models.py`)
  - Fields: `id`, `name`, `description`, `status`, `created_at`, `updated_at`
- **CRUD Logic:** `product_crud.py`
  - `create(db, category_data)` creates a new category.
- **Who Can Create:** Typically, only superadmin or admin roles (enforced at API/service layer).
- **Schema:** `ProductCategoryRead` (`product_management_schemas.py`)
  - Fields: `id`, `name`, `description`, `display_order`, `is_active`
- **API Route:** (Not found in superadmin.py, but likely in a dedicated category endpoint, e.g. `/categories` POST)

### 2. Assign Category to Shop
- **Model:** `Product` (`models/models.py`)
  - Field: `category_id` (ForeignKey to `Category`)
  - Field: `shop_id` (ForeignKey to `Shop`)
- **CRUD Logic:** `shop_product_crud.py`
  - `bulk_create(db, shop_id, product_data)` assigns products (with categories) to a shop.
- **API Route:** `/products/shop/{shop_id}` (GET) — fetches products for a shop, including category info.
- **Business Logic:** Products are assigned to shops, and each product references a category.

### 3. Category Items (Products) Creation
- **Model:** `Product` (`models/models.py`)
  - Fields: `id`, `name`, `category_id`, `shop_id`, `description`, `price`, `status`, etc.
- **Who Can Create:** Superadmin, admin, or owner (depending on API/service permissions).
- **Schema:** `ProductCreate`, `ProductRead` (`product_management_schemas.py`)
- **API Route:** `/products` (POST) — create product with category and shop assignment.

### 4. Who Can Get Categories/Items
- **API Route:** `/products/category/{category_id}` (GET) — get products by category.
- **API Route:** `/products/shop/{shop_id}` (GET) — get products by shop.
- **Business Logic:** Any authenticated user with access to the shop or category can fetch items.

### 5. Relevant Files
- `backend/src/models/models.py` (Category, Product models)
- `backend/src/features/product/crud/product_crud.py` (Category/Product CRUD)
- `backend/src/features/product/crud/shop_product_crud.py` (Shop-product assignment)
- `backend/src/features/product/api/product_endpoints.py` (API routes)
- `backend/src/features/product/schemas/product_management_schemas.py` (Schemas)

---

## Owner User Management Endpoints (Owner-Admin)

### 1. Create Users (Farmer, Buyer, Employee)
- **Endpoint:** `POST /owner-admin/shops/{shop_id}/users`
- **Handler:** `add_users_to_shop` in `backend/src/api/owner_admin.py`
- **Service:** `UserService.add_users_to_shop(shop_id, users_data, db)`
- **Logic:** Allows creation of farmers and buyers for a shop. Passwords are hashed. Users are linked to the shop via `shop_id`.

### 2. List Users by Role
- **Endpoint:** `GET /owner-admin/shops/{shop_id}/users?role={role}`
- **Handler:** `get_shop_users` in `backend/src/api/owner_admin.py`
- **Service:** `UserService.get_users(shop_id=shop_id, role=role, db)`
- **Logic:** Returns users for a shop, optionally filtered by role (farmer, buyer, employee).

### 3. Activate/Deactivate Users
- **Endpoint:** `PATCH /owner-admin/shops/{shop_id}/users/{user_id}/status`
- **Handler:** `update_user_status` in `backend/src/api/owner_admin.py` *(to be added)*
- **Service:** `UserService.update_user(db, user_id, status="active"/"inactive")`
- **Logic:** Updates user status (active/inactive) for a given user in the shop.

### 4. Delete Users
- **Endpoint:** `DELETE /owner-admin/shops/{shop_id}/users/{user_id}`
- **Handler:** `delete_user_from_shop` in `backend/src/api/owner_admin.py` *(to be added)*
- **Service:** `UserService.delete_user(db, user_id)`
- **Logic:** Deletes a user by ID from the shop.

### 5. Password Reset
- **Endpoint:** `PATCH /owner-admin/shops/{shop_id}/users/{user_id}/password`
- **Handler:** `reset_user_password` in `backend/src/api/owner_admin.py` *(to be added)*
- **Service:** `UserService.update_user(db, user_id, password_hash=new_hash)`
- **Logic:** Allows owner to reset password for a user in their shop.

### 6. User Linkage
- **Logic:** Users are linked to the owner/shop via the `shop_id` field in the User model.

---

### Summary Table: Owner User Management

| Action                | Endpoint                                                      | Method   |
|-----------------------|---------------------------------------------------------------|----------|
| Create User           | `/owner-admin/shops/{shop_id}/users`                          | POST     |
| List Users by Role    | `/owner-admin/shops/{shop_id}/users?role={role}`              | GET      |
| Activate/Deactivate   | `/owner-admin/shops/{shop_id}/users/{user_id}/status`         | PATCH    |
| Delete User           | `/owner-admin/shops/{shop_id}/users/{user_id}`                | DELETE   |
| Password Reset        | `/owner-admin/shops/{shop_id}/users/{user_id}/password`       | PATCH    |

---

**Note:** Endpoints for activation/deactivation, deletion, and password reset should be added to `owner_admin.py` to fully support owner user management. Business logic is already present in `user_service.py`.

---

## Owner Transaction Journey: Quick Sale & Payment Logic

### 1. Transaction Creation (Quick Sale)
- **Endpoint:** `POST /transactions/`
- **Schema:** `QuickSaleRequest`
  - `shop_id`: int
  - `farmer_id`: int
  - `buyer_id`: int
  - `items`: List of `{product_id, quantity, rate}`
  - `payment_mode`: str ("cash" or "credit")
  - `notes`: Optional
- **Business Logic:**
  - Owner selects farmer, buyer, enters product, price per kg, total weight, payment mode.
  - Commission is calculated automatically.

### 2. Commission Confirmation
- **Endpoint:** `PUT /transactions/{transaction_id}/commission-confirm?confirmed=true|false`
- **Schema:** Boolean query param
- **Business Logic:** Owner/admin can confirm commission received for transaction.

### 3. Payment Logic & API Response
- **API Response (creation/summary):**
  - `transaction_id`, `shop_id`, `farmer_id`, `buyer_id`, `total_amount`, `commission_amount`, `commission_confirmed`
  - `farmer_paid`, `farmer_unpaid` (paid/unpaid breakdown)
  - `buyer_paid`, `buyer_unpaid` (paid/unpaid breakdown)
  - `payment_status`, `date`, `items`
- **Logic:**
  - If farmer is paid in full: `farmer_paid = sale_value - commission`, `farmer_unpaid = 0`
  - If not: `farmer_paid = x`, `farmer_unpaid = y`
  - If buyer paid in full: `buyer_paid = total_sale_value`, `buyer_unpaid = 0`
  - If not: `buyer_paid = x`, `buyer_unpaid = y`

### 4. Transaction Completion & Cancellation
- **Endpoints:**
  - `PUT /transactions/{transaction_id}/complete`
  - `PUT /transactions/{transaction_id}/cancel`
- **Business Logic:**
  - Owner can mark transaction as completed or cancelled. All payment and stock effects are reversed on cancel.

### 5. Transaction Summary
- **Endpoint:** `GET /transactions/{transaction_id}/summary`
- **API Response:** Includes all paid/unpaid breakdowns, commission status, and item details.

### 6. Edge Cases Covered
- Partial payments for farmer and buyer
- Commission confirmation (boolean)
- Transaction cancellation and completion
- All amounts and statuses are tracked and exposed in API responses

### 7. Relevant Files & Methods
- API: `backend/src/features/transaction/api/transaction_endpoints.py`
- Service: `backend/src/services/transaction_service.py`
- CRUD: `backend/src/crud/transaction_crud.py`
- Schemas: `backend/src/schemas/transaction_schemas.py`
- Models: `backend/src/models/transaction.py`, `backend/src/models/transaction_item.py`

---

### Transaction API Response Example
```json
{
  "transaction_id": 123,
  "shop_id": 1,
  "farmer_id": 10,
  "buyer_id": 20,
  "total_amount": 10000.0,
  "commission_amount": 500.0,
  "commission_confirmed": true,
  "farmer_paid": 9500.0,
  "farmer_unpaid": 0.0,
  "buyer_paid": 10000.0,
  "buyer_unpaid": 0.0,
  "payment_status": "completed",
  "date": "2025-09-01",
  "items": [ ... ]
}
```

---

## Product Creation & Assignment (Superadmin)

### Product Creation
- **API Route:** `POST /products` (in `backend/src/api/endpoints/product.py`)
- **Who Can Create:** Superadmin can create products (e.g., flower, rose, vegetable, carrot) and assign them to categories and shops.
- **Service Logic:** `ProductService.create_product(db, product)`
- **Schema:** `ProductCreate` (see `schemas/product_schemas.py`)
- **Model:** `Product` (see `models/models.py`)
- **Business Logic:** Superadmin can create any product and assign it to any category and shop. Products are available for assignment to shops by superadmin or owner.

### Assign Product to Shop (Superadmin)
- **API Route:** `POST /shops/{shop_id}/products` (in `backend/src/api/superadmin.py`)
- **Who Can Assign:** Superadmin can assign any product to any shop.
- **Service Logic:** `ProductService.assign_products_to_shop(shop_id, product_data)`
- **Schema:** `ProductAssignRequest` (see `schemas/product_management_schemas.py`)
- **Model:** `ShopProduct` (see `models/shop_product.py`)
- **Business Logic:** Superadmin selects products and assigns them to shops. Assigned products are available for sale in the shop.

---
