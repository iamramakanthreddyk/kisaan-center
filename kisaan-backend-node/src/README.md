# src Folder Structure

This README documents the purpose of each folder in the backend `src` directory for maintainability and onboarding.

## Folders

- **api/**: API layer, request/response handling
- **config/**: Configuration files (env, db, etc.)
- **controllers/**: Route controllers, business logic entry points
- **core/**: Core utilities, base classes, shared logic
- **database/**: Database scripts, migration guides
- **domain/**: Domain models, business entities
- **dtos/**: Data Transfer Objects for API communication
- **entities/**: ORM entities, database models
- **mappers/**: Mapping logic between layers
- **middlewares/**: Express middlewares (auth, error handling, etc.)
- **models/**: Unified Sequelize models (aligned with DB schema)
- **repositories/**: Data access layer, repository pattern
- **routes/**: Express route definitions
- **schemas/**: Validation schemas (Joi, Zod, etc.)
- **seeders/**: Database seed scripts
- **services/**: Business logic/services
- **shared/**: Shared utilities, constants
- **types/**: TypeScript types/interfaces
- **utils/**: Utility functions

## Notes
- All models are now unified under `models/`.
- Old migration scripts and duplicate folders have been removed.
- For further details, see `docs/` and `schema/README.md`.
