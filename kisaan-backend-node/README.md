# Kisaan Backend Node.js

This is the clean, modular Node.js backend for Kisaan Center.

## Structure
- `src/controllers/` - Route handlers
- `src/routes/` - API route definitions
- `src/models/` - Data models
- `src/services/` - Business logic
- `src/middlewares/` - Middleware (auth, error handling)
- `src/utils/` - Utility functions
- `src/config/` - Configuration files
- `src/app.ts` - Express app setup
- `src/server.ts` - Entry point

## Getting Started
1. Install dependencies: `npm install`
2. Run in dev mode: `npm run dev`
3. Build: `npm run build`
4. Start: `npm start`

## Docker / CI note
The Docker build creates a small placeholder SQL file at `src/migrations/.placeholder.sql` during the build stage so the image build succeeds even when there are no SQL migration files checked into the repo. If you add real SQL migrations, place them under `src/migrations/` and they will be copied into the image and used by the runtime.
