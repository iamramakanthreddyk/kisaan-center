# Clean Architecture Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing and using the clean architecture patterns established in this project.

## 🚀 Getting Started

### 1. Architecture Blueprint
**Start Here:** Read `ARCHITECTURE_BLUEPRINT.md` first
- Contains all architectural rules and patterns
- Defines layer responsibilities
- Provides quality gates and best practices

### 2. Directory Structure
Follow the established structure:
```
src/
├── api/              # API routes and middleware
├── controllers/      # HTTP request handlers
├── services/         # Business logic layer
├── repositories/     # Data access layer
├── database/         # Database models and config
├── domain/           # Business entities and rules
├── shared/           # Shared utilities and types
│   ├── constants/    # Application constants
│   ├── dtos/         # Data Transfer Objects
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── helpers/      # Helper classes
└── infrastructure/   # External services and config
```

## 📚 How to Use This Architecture

### Step 1: Create a New Feature
When adding a new feature (e.g., Product management):

1. **Start with Domain Entity**
   ```typescript
   // src/domain/entities/ProductEntity.ts
   export class ProductEntity {
     constructor(
       public id?: number,
       public name: string,
       public price: number,
       // ... other properties
     ) {}
     
     // Business logic methods here
     calculateDiscountedPrice(discount: number): number {
       return this.price * (1 - discount);
     }
   }
   ```

2. **Create DTOs**
   ```typescript
   // Add to src/shared/dtos/index.ts
   export interface CreateProductDTO {
     name: string;
     price: number;
     category: string;
   }
   
   export interface ProductDTO {
     id: number;
     name: string;
     price: number;
     // ... response fields
   }
   ```

3. **Build Repository**
   ```typescript
   // src/repositories/ProductRepository.ts
   export class ProductRepository extends BaseRepository<ProductEntity> {
     // Data access methods
   }
   ```

4. **Implement Service**
   ```typescript
   // src/services/ProductService.ts
   export class ProductService {
     constructor(private productRepository: ProductRepository) {}
     
     async createProduct(data: CreateProductDTO): Promise<ProductDTO> {
       // Business logic here
     }
   }
   ```

5. **Create Controller**
   ```typescript
   // src/controllers/ProductController.ts
   export class ProductController {
     constructor(private productService: ProductService) {}
     
     async createProduct(req: Request, res: Response): Promise<void> {
       // HTTP handling here
     }
   }
   ```

### Step 2: Follow the Data Flow
```
API Request → Controller → Service → Repository → Database
                ↓            ↓          ↓
            Validation   Business    Data
            & HTTP      Logic &     Access &
            Handling    Rules       Mapping
```

### Step 3: Use Shared Utilities

#### Validation
```typescript
import { ValidationHelpers } from '../shared/utils/validation';

const validation = ValidationHelpers.validateAndSanitizeUser(userData);
if (!validation.isValid) {
  throw new ValidationError('Invalid data', validation.errors);
}
```

#### Error Handling
```typescript
import { ValidationError, NotFoundError } from '../shared/utils/errors';

// Throw specific errors in services
throw new NotFoundError('Product not found');

// Handle in controllers
catch (error) {
  if (error instanceof ValidationError) {
    ResponseHelper.Http.sendError(res, { message: error.message }, 400);
  }
}
```

#### Response Formatting
```typescript
import { Response as ResponseHelper } from '../shared/helpers';

// Success response
ResponseHelper.Http.sendSuccess(res, data, 200, 'Success message');

// Created response
ResponseHelper.Http.sendCreated(res, newResource, 'Resource created');

// Error response
ResponseHelper.Http.sendError(res, { message: 'Error' }, 400);
```

## 🎯 Examples in Action

### Complete User Implementation
See these files for full examples:
- `src/controllers/UserController.simple.ts` - Clean controller implementation
- `src/services/UserService.simple.ts` - Business logic patterns
- `src/repositories/UserRepository.ts` - Data access patterns

### Key Patterns Demonstrated

1. **Input Validation**
   ```typescript
   // Extract and validate request data
   const { data, errors } = RequestHelper.Extractor.extractBody(req, {
     required: ['name', 'email'],
     optional: ['phone'],
     types: { name: 'string', email: 'string' },
     sanitize: true,
   });
   ```

2. **Business Rules**
   ```typescript
   // Check business constraints
   if (existingUser) {
     throw new ConflictError('User already exists');
   }
   
   // Validate permissions
   if (!this.canUserPerformAction(currentUser, action)) {
     throw new ValidationError('Insufficient permissions');
   }
   ```

3. **Error Handling**
   ```typescript
   try {
     const result = await this.service.performAction(data);
     ResponseHelper.Http.sendSuccess(res, result);
   } catch (error) {
     this.handleError(error, res);
   }
   ```

## 🔧 Utility Usage

### Constants
```typescript
import { USER_ROLES, USER_STATUS, API_CONFIG } from '../shared/constants/index';

// Use throughout the application
if (user.role === USER_ROLES.OWNER) {
  // Owner-specific logic
}
```

### Validation Helpers
```typescript
import { ValidationHelpers } from '../shared/utils/validation';

// Validate pagination
const pagination = ValidationHelpers.validatePagination(page, limit);

// Validate ID parameter
const { isValid, id, error } = ValidationHelpers.validateId(req.params.id);

// Validate user data
const validation = ValidationHelpers.validateAndSanitizeUser(userData);
```

### Formatting Utilities
```typescript
import { NumberFormatter, DateFormatter } from '../shared/utils/formatting';

// Format currency
const price = NumberFormatter.currency(1234.56); // "$1,234.56"

// Format dates
const relativeTime = DateFormatter.relativeTime(someDate); // "2 hours ago"
```

### Database Helpers
```typescript
import { QueryBuilder, PaginationHelper } from '../shared/utils/database';

// Build complex queries
const whereClause = QueryBuilder.buildWhereClause(filters);

// Handle pagination
const paginatedResult = await PaginationHelper.paginate(query, page, limit);
```

## 🛡️ Security Patterns

### Authentication
```typescript
import { AuthUtils } from '../shared/utils/auth';

// Hash passwords
const hashedPassword = await AuthUtils.Password.hash(password);

// Verify passwords
const isValid = await AuthUtils.Password.verify(password, hashedPassword);

// Generate JWT tokens
const token = AuthUtils.JWT.generate({ userId, role });
```

### Permission Checking
```typescript
// Check user permissions
const hasPermission = AuthUtils.Permission.check(user.role, PERMISSIONS.USER_CREATE);

// Role-based access
if (!AuthUtils.Permission.hasRole(user, USER_ROLES.ADMIN)) {
  throw new ValidationError('Access denied');
}
```

## 📋 Development Rules

### Do's ✅
- Always validate input at controller layer
- Implement business logic in service layer
- Use DTOs for data transfer
- Handle errors appropriately
- Use shared utilities and constants
- Follow naming conventions
- Write clean, readable code

### Don'ts ❌
- Don't put business logic in controllers
- Don't access database directly from controllers
- Don't use any types
- Don't ignore error handling
- Don't hardcode values
- Don't skip validation
- Don't mix concerns between layers

## 🧪 Testing Patterns

### Unit Testing Services
```typescript
describe('UserService', () => {
  it('should create user with valid data', async () => {
    // Arrange
    const userData = { name: 'John', email: 'john@example.com' };
    
    // Act
    const result = await userService.createUser(userData, currentUserId);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

### Integration Testing Controllers
```typescript
describe('UserController', () => {
  it('should return 201 when creating user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send(validUserData)
      .expect(201);
      
    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Deployment Considerations

### Environment Configuration
```typescript
// Use configuration helpers
import { CONFIG } from '../shared/constants/index';

const dbConfig = {
  host: CONFIG.DB.HOST,
  port: CONFIG.DB.PORT,
  // ...
};
```

### Migration Strategy
See `src/database/MIGRATION_GUIDE.md` for:
- Database schema updates
- Data migration steps
- Backward compatibility

## 📖 Additional Resources

### Architecture Documentation
- `ARCHITECTURE_BLUEPRINT.md` - Complete architectural guide
- `src/database/MIGRATION_GUIDE.md` - Database migration guide
- `src/shared/README.md` - Shared utilities documentation

### Example Implementations
- `UserController.simple.ts` - Controller patterns
- `UserService.simple.ts` - Service patterns
- `User.ts` - Model patterns

### Utility Documentation
- Constants: Centralized application constants
- Validation: Input validation and sanitization
- Formatting: Data formatting utilities
- Auth: Authentication and authorization
- Database: Query building and pagination
- Errors: Custom error handling
- Helpers: Request/response utilities

## 🔄 Continuous Improvement

### Adding New Utilities
1. Create in appropriate `src/shared/utils/` directory
2. Export from `src/shared/utils/index.ts`
3. Add to this documentation
4. Write tests

### Extending Base Classes
1. Modify base classes in `src/*/base/`
2. Update all implementations
3. Update documentation
4. Test thoroughly

### New Patterns
1. Document in `ARCHITECTURE_BLUEPRINT.md`
2. Create examples
3. Update this guide
4. Share with team

---

**Remember**: This architecture is designed to be scalable and maintainable. Always follow the established patterns and update documentation when adding new features or patterns.