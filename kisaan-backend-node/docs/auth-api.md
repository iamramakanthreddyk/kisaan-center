# Auth API Documentation

This document describes the authentication-related endpoints for Kisaan Backend Node.js.

## Endpoints

### POST /api/auth/login
- **Description:** Authenticate user and return JWT token.
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt-token-string",
      "user": { /* user object */ }
    }
  }
  ```

### POST /api/auth/register
- **Description:** Register a new user.
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": { /* user object */ }
    }
  }
  ```

## Notes
- All authentication endpoints are defined in `src/routes/auth.routes.ts`.
- Controllers are in `src/controllers/auth.controller.ts`.
- Business logic is in `src/services/auth.service.ts`.
- Update this file whenever you add or change auth-related APIs.
