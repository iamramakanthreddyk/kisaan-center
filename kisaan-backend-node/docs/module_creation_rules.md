# Module Creation Rules & Checklist (Node.js + Sequelize)

This document provides a step-by-step guide and best practices for creating a new module (feature) in your backend. Follow these rules for every new domain (e.g., Shop, User, Product) to ensure consistency, maintainability, and testability.

---

## 1. Entity
- Create an Entity class in `src/entities/` (e.g., `ShopEntity.ts`).
- Represents the business/data structure, not tied to ORM.

## 2. DTO (Data Transfer Object)
- Define DTO interfaces in `src/dtos/` (e.g., `ShopDTO.ts`).
- Separate DTOs for Create, Update, and Read as needed.
- Use DTOs for API input/output and service boundaries.

## 3. Model (Sequelize)
- Define the Sequelize model in `src/models/` (e.g., `shop.ts`).
- Match the Entity and DTO structure.


## 4. Migration
- Create a migration file in `migrations/` for the table.
- Use Sequelize CLI or manual JS file.
- Migration must match the model fields and constraints.
- **For PostgreSQL:** Always use unique index names (e.g., `table_column_idx`) to avoid conflicts across tables.
- Run: `npx sequelize-cli db:migrate`

## 5. Mapper
- Add a mapper in `src/mappers/` (e.g., `shopMapper.ts`).
- Functions to convert between Entity, DTO, and Model.

## 6. Schema (Validation)
- Add Zod/Joi schemas in `src/schemas/` (e.g., `shop.ts`).
- Use for request validation in controllers.

## 7. Service
- Implement business logic in `src/services/` (e.g., `shopService.ts`).
- CRUD and domain logic, using Entity/DTO.

## 8. Controller
- Add API handlers in `src/controllers/` (e.g., `shopController.ts`).
- Use validation, call service, handle errors.

## 9. Routes
- Register routes in `src/routes/` (e.g., `shopRoutes.ts`).
- Add to `app.ts` with correct base path.

## 10. Seed Data
- Create seed data/scripts in `seed/` or `scripts/`.
- Use for local dev and integration tests.

## 11. Integration Tests
- Write tests in `tests/integration/` (e.g., `shop.integration.test.ts`).
- Cover all endpoints and business logic.

## 12. Documentation
- Document API endpoints in `docs/api/`.
- Update module checklist and rules as needed.

---


## General Rules
- Keep code DRY and modular.
- Use RBAC and authentication middleware where needed.
- Validate all input with schemas.
- Always run and verify migrations before testing.
- Keep seed data and tests up to date with model changes.
- **Single Source of Truth:** Only keep one version of each seed or migration script in the designated folder (e.g., `seed/` for seeders, `migrations/` for migrations). Never duplicate scripts across folders. Remove or archive old versions after refactoring or moving scripts.
- **Folder Convention:** Decide and document a single folder for all seed scripts and all migration scripts. Update generic runners to only look in those folders.
- **Automated Checks:** Add a script or CI check to warn if duplicate or deprecated seed files exist in multiple locations.
- Document every new module and update this checklist if your process changes.

---

_Store this file in `docs/module_creation_rules.md` and keep it updated for your team!_
