# Module Migration Checklist (Sequelize + Node.js)

Use this checklist whenever you add a new model/module to your backend. This ensures your database and API are always in sync and ready for integration tests.

---

## 1. Model & Migration
- [ ] **Define Sequelize Model** in `src/models/` (e.g., `shop.ts`).
- [ ] **Create Migration File** in `migrations/` matching the model structure.
    - Use Sequelize CLI or manually create a migration JS file.
- [ ] **Run Migration** to create/update the table:
    ```sh
    npx sequelize-cli db:migrate
    ```
- [ ] **Verify Table Exists** in the database.

## 2. Business Logic & API
- [ ] **Create Service Layer** in `src/services/` (CRUD logic).
- [ ] **Create Controller** in `src/controllers/` (API handlers).
- [ ] **Register Routes** in `src/routes/` and add to `app.ts`.
- [ ] **Add Validation Schemas** in `src/schemas/` (Zod or Joi).

## 3. Integration & Testing
- [ ] **Write Integration Tests** in `tests/integration/`.
- [ ] **Seed Data** if needed for tests (`seed/` or scripts).
- [ ] **Run Tests** to verify API and DB integration:
    ```sh
    npx ts-node tests/integration/<module>.integration.test.ts
    ```

## 4. Documentation
- [ ] **Document API Endpoints** in `docs/api/`.
- [ ] **Update this checklist** if your process changes.

---

**Tip:** If you see `No migrations were executed`, check that you have a migration file for your new model and that it hasn't already been applied.

**Common Issues:**
- 404 on API: Route not registered or backend not running.
- 500 on API: Table missing, migration not run, or DB error.
- Test fails: Check DB, migration, and route registration.

---

_Keep this file up to date for your team!_
