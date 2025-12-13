# User API Endpoints

All user-related API endpoints for the Kisaan Center Node.js backend. These endpoints are registered in `src/routes/userRoutes.ts` and mounted in `src/index.ts` under `/api/users`.

## Endpoints

### Create User
- **POST** `/api/users/`
- Body: `{ username, password, role, shop_id?, contact?, email?, status?, created_by? }`
- Response: Created user object

### Get All Users
- **GET** `/api/users/`
- Response: Array of user objects

### Get User by ID
- **GET** `/api/users/:id`
- Response: User object or 404

### Update User
- **PUT** `/api/users/:id`
- Body: Partial user fields (see schema)
- Response: Updated user object or 404

### Delete User
- **DELETE** `/api/users/:id`
- Response: 204 No Content or 404

## Related Files
- Controller: `src/controllers/userController.ts`
- Routes: `src/routes/userRoutes.ts`
- Model: `src/models/user.ts`
- Schema: `src/schemas/user.ts`
- Migration: `migrations/20250905_create_users_table.js`

## Notes
- All endpoints use JSON request/response.
- Input validation is handled by Zod schemas in `src/schemas/user.ts`.
- Authentication/authorization to be added later.
