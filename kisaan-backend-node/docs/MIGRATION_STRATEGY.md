# Kisaan Backend Node: Clean Migration Strategy

This document explains the recommended approach for migrating from a legacy (Python) backend to the new Node.js backend, while keeping both systems running until the transition is complete.

---

## Migration Steps

1. **Create New Tables for Node.js**
   - Use Sequelize migrations to create new tables (e.g., `kisaan_users`) instead of reusing old table names.
   - This avoids conflicts and lets you develop/test Node.js features independently.

2. **Migrate Data (Optional)**
   - If you need to preserve old data, write a script to copy data from old tables to new ones (mapping fields as needed).
   - You can run both systems in parallel during this phase.

3. **Switch Node.js Backend to New Tables**
   - Update your models to use the new table names (e.g., `tableName: 'kisaan_users'`).
   - Test thoroughly using the new tables.

4. **Drop Old Tables (When Ready)**
   - Once you confirm the Node.js backend is stable and all data is migrated, drop the old tables from the database.

---

## Benefits
- No risk of breaking the legacy system during migration.
- Node.js backend can be developed, tested, and deployed independently.
- Easy rollback if needed.

---

## How to Use
- Update DB connection settings in `src/config/database.ts` for your environment.
- Run migrations: `npx sequelize-cli db:migrate`
- Use the new tables in your Node.js backend code.
- (Optional) Write scripts to migrate or seed data as needed.

---

_Last updated: 2025-09-05_
