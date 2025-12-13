# KisaanCenter API Categories & Documentation Index

This document lists the main API categories for the KisaanCenter system, with a focus on keeping the backend, frontend, and documentation in sync. Use this as a reference for DB schema, API, and service layer organization.

---

## API Categories

1. **Authentication & Login**
   - User login (all roles)
   - Token/session management

2. **User Management**
   - Owners
   - Farmers
   - Buyers
   - User creation, update, status, password reset

3. **Shop & Plan Management**
   - Shop creation, update, status
   - Plan creation, assignment, upgrade/downgrade

4. **Product & Category Management**
   - Product CRUD
   - Category CRUD
   - Product-category assignment

5. **Transaction & Payment**
   - Sale/transaction entry
   - Payment (full/partial/credit)
   - Credit/advance management
   - Commission calculation

6. **Reporting & Ledger**
   - Farmer ledger
   - Buyer ledger
   - Shop/owner dashboard
   - End-of-day summary

---

## Where to Document
- **DB Schema:** Documented in migration scripts, models, and a central `db_schema.md` (to be created).
- **API Schemas:** All request/response schemas in `schemas/` or `api/schemas/` (to be consolidated).
- **Service Layer:** Business logic in `services/` folder, documented per service.
- **API Endpoints:** Documented in `docs/` folder, one file per category (e.g., `auth-api.md`, `transaction-api.md`).

---

**Next Steps:**
1. Review and document the DB schema for each category.
2. Review and document the API endpoints for each category.
3. Review and document the service layer for each category.

Keep this file updated as you add or refactor categories and APIs.# KisaanCenter API Categories & Documentation Index

This document lists the main API categories for the KisaanCenter system, with a focus on keeping the backend, frontend, and documentation in sync. Use this as a reference for DB schema, API, and service layer organization.

---

## API Categories

1. **Authentication & Login**
   - User login (all roles)
   - Token/session management

2. **User Management**
   - Owners
   - Farmers
   - Buyers
   - User creation, update, status, password reset

3. **Shop & Plan Management**
   - Shop creation, update, status
   - Plan creation, assignment, upgrade/downgrade

4. **Product & Category Management**
   - Product CRUD
   - Category CRUD
   - Product-category assignment

5. **Transaction & Payment**
   - Sale/transaction entry
   - Payment (full/partial/credit)
   - Credit/advance management
   - Commission calculation

6. **Reporting & Ledger**
   - Farmer ledger
   - Buyer ledger
   - Shop/owner dashboard
   - End-of-day summary

---

## Where to Document
- **DB Schema:** Documented in migration scripts, models, and a central `db_schema.md` (to be created).
- **API Schemas:** All request/response schemas in `schemas/` or `api/schemas/` (to be consolidated).
- **Service Layer:** Business logic in `services/` folder, documented per service.
- **API Endpoints:** Documented in `docs/` folder, one file per category (e.g., `auth-api.md`, `transaction-api.md`).

---

**Next Steps:**
1. Review and document the DB schema for each category.
2. Review and document the API endpoints for each category.
3. Review and document the service layer for each category.

Keep this file updated as you add or refactor categories and APIs.
