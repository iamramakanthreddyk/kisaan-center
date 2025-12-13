# Shop API Documentation

## Endpoints

### Create Shop
- **POST** `/api/v1/shops`
- **Body:**
  ```json
  {
    "name": "Test Shop",
    "owner_id": "OWN123",
    "address": "123 Main St",
    "contact": "9876543210"
  }
  ```
- **Response:**
  - 201 Created
  - `{ shop: { ...shop fields... } }`

### Get All Shops
- **GET** `/api/v1/shops`
- **Query:** `owner_id` (optional)
- **Response:**
  - 200 OK
  - `{ shops: [ ... ] }`

### Get Shop by ID
- **GET** `/api/v1/shops/:id`
- **Response:**
  - 200 OK
  - `{ shop: { ... } }`
  - 404 Not Found

### Update Shop
- **PUT** `/api/v1/shops/:id`
- **Body:**
  ```json
  {
    "address": "New Address",
    "status": "inactive"
  }
  ```
- **Response:**
  - 200 OK
  - `{ shop: { ... } }`

### Delete Shop
- **DELETE** `/api/v1/shops/:id`
- **Response:**
  - 200 OK
  - `{ message: "Shop deleted successfully" }`
  - 404 Not Found

## Data Model
- `id`: number
- `name`: string
- `owner_id`: string
- `address`: string (optional)
- `contact`: string (optional)
- `status`: 'active' | 'inactive'
- `created_at`: Date
- `updated_at`: Date

## Notes
- All endpoints follow the Entity/DTO/Mapper pattern.
- Validation is enforced via Zod schemas.
- See integration tests for usage examples.
