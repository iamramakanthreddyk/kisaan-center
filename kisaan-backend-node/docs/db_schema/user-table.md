# User Table Schema



Table: `kisaan_users`

See `src/models/user.ts` for Sequelize model and `migrations/20250905_create_kisaan_users_table.js` for migration.

- id (PK, auto-increment)
- username (string, unique, required)
- password (string, required)
- role (enum: superadmin, owner, farmer, buyer)
- owner_id (string, nullable for superadmin/owner, required for farmer/buyer)
- shop_id (FK, nullable)
- contact (string, optional)
- email (string, optional)
- status (enum: active, inactive)
- created_by (FK, nullable)
- created_at (datetime)
- updated_at (datetime)

## Multi-Tenancy & Username Convention

- Each owner is a tenant and gets a unique `owner_id` (e.g., OWN123).
- All farmers and buyers are linked to an `owner_id`.
- Farmer/buyer usernames are auto-generated as `{firstname}_{ownerid}` (e.g., `ram_OWN123`).
- This ensures uniqueness and easy login/user management.

---

_Last updated: 2024-06-09_
