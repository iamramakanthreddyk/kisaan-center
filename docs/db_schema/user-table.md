# User Table - DB Schema Documentation

## Table: users

| Column      | Type         | Description                                 |
|-------------|--------------|---------------------------------------------|
| id          | INTEGER (PK) | Unique user ID                              |
| username    | TEXT         | Username (unique, required)                 |
| password    | TEXT         | Hashed password                            |
| role        | TEXT/ENUM    | Role: superadmin, owner, farmer, buyer      |
| shop_id     | INTEGER (FK) | Shop this user belongs to (nullable)        |
| contact     | TEXT         | Phone number or contact info (optional)     |
| email       | TEXT         | Email (optional, not required for farmers)  |
| status      | TEXT/ENUM    | active, inactive, etc.                      |
| created_by  | INTEGER (FK) | User who created this user (nullable)       |
| created_at  | DATETIME     | Timestamp of creation                       |
| updated_at  | DATETIME     | Timestamp of last update                    |

## Indexes & Constraints
- `username` is unique
- `shop_id` is a foreign key to `shops.id`
- `role` is an ENUM or validated string
- `status` is an ENUM or validated string

## Folder Index
- DB Schema: `docs/db_schema/user-table.md`
- API Schemas: `schemas/user.ts` (Node) or `schemas/user.py` (Python)
- Service: `services/userService.ts` or `services/user_service.py`
- API: `routes/user.routes.ts` or `api/user.py`

---

Keep this file updated with any changes to the user table or related business rules.
