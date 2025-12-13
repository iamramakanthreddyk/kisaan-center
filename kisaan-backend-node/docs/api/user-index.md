# User API Folder Index

This folder contains all files related to the User API endpoints, business logic, and schema for the Kisaan Center Node.js backend.

## Index

- **Controller:** `src/controllers/userController.ts`  
  Handles all user-related request logic (CRUD operations).
- **Routes:** `src/routes/userRoutes.ts`  
  Express router for user endpoints, mounted at `/api/users`.
- **Model:** `src/models/user.ts`  
  Sequelize model for the `users` table.
- **Schema:** `src/schemas/user.ts`  
  Zod schemas for input validation and type safety.
- **Migration:** `migrations/20250905_create_users_table.js`  
  Sequelize migration for creating the `users` table.
- **API Documentation:** `docs/api/user-api.md`  
  Documentation for all user endpoints and related files.

## Usage
- All user API endpoints are registered in `userRoutes.ts` and mounted in `index.ts`.
- Business logic is in `userController.ts`.
- Input validation is handled by Zod schemas.
- Database structure is defined in the Sequelize model and migration.

---

_Last updated: 2024-06-09_
