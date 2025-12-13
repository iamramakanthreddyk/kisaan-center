# Kisaan Backend Development Guidelines

## 🎯 DRY Development Rules

### ⚠️ BEFORE Creating New Code

1. **Always Check Existing Code First**
   ```bash
   # Search for existing models
   grep -r "export.*Model\|interface.*{" src/models/
   
   # Search for existing endpoints
   grep -r "router\.\(get\|post\|put\|delete\)" src/routes/
   
   # Search for existing services
   grep -r "export.*function\|export const.*=" src/services/
   ```

2. **Use Existing Utilities**
   - `src/utils/responseUtils.ts` - Standardized API responses
   - `src/utils/validationUtils.ts` - Common validation functions
   - `src/utils/queryUtils.ts` - Database query helpers
   - `src/utils/dateUtils.ts` - Date formatting utilities

3. **Follow Established Patterns**
   - **Route → Controller → Service → Model** (layered architecture)
   - **Function exports** over class-based patterns (for consistency)
   - **Standardized error handling** using response utilities

## 🏗️ Architecture Standards

### Controller Pattern (STANDARDIZED)
```typescript
// ✅ CORRECT: Use function exports + response utilities
import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils/responseUtils';
import { validateSchema } from '../utils/validationUtils';
import * as serviceFunction from '../services/serviceFile';

export const controllerFunction = asyncHandler(async (req: Request, res: Response) => {
  // 1. Validate input
  const validation = validateSchema(SomeSchema, req.body);
  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  // 2. Call service layer
  const result = await serviceFunction.doSomething(validation.data);
  if (!result) {
    return sendNotFound(res, 'Resource');
  }

  // 3. Return standardized response
  return sendSuccess(res, result, 'Operation successful');
});
```

### Service Pattern (STANDARDIZED)
```typescript
// ✅ CORRECT: Use function exports + query utilities
import { recordExists, getPaginatedResults } from '../utils/queryUtils';

export const serviceFunctionName = async (params: SomeType): Promise<ResultType> => {
  // 1. Validate dependencies
  if (params.relatedId && !await recordExists('related_table', params.relatedId)) {
    throw new Error('Related record not found');
  }

  // 2. Use query utilities for database operations
  const result = await getPaginatedResults(/* query parameters */);
  
  // 3. Return typed result
  return result;
};
```

## 🚫 What NOT to Do

### ❌ Don't Create Duplicate Code
```typescript
// ❌ WRONG: Duplicating response patterns
res.status(400).json({ success: false, error: 'Bad request' });
res.status(404).json({ success: false, error: 'Not found' });
res.status(500).json({ success: false, error: 'Server error' });

// ✅ CORRECT: Use response utilities
sendBadRequest(res, 'Bad request');
sendNotFound(res, 'Resource');
sendError(res, 'Server error');
```

### ❌ Don't Mix Architecture Patterns
```typescript
// ❌ WRONG: Mixing class-based and function exports
export class SomeController { /* methods */ }
export const someOtherController = async (req, res) => { /* logic */ };

// ✅ CORRECT: Consistent function exports
export const controllerOne = asyncHandler(async (req, res) => { /* logic */ });
export const controllerTwo = asyncHandler(async (req, res) => { /* logic */ });
```

### ❌ Don't Put Business Logic in Controllers
```typescript
// ❌ WRONG: Business logic in controller
export const createUser = async (req: Request, res: Response) => {
  // Complex business logic here
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ ...req.body, password: hashedPassword });
  // More business logic...
};

// ✅ CORRECT: Delegate to service layer
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const validation = validateSchema(UserCreateSchema, req.body);
  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }
  
  const user = await userService.createUser(validation.data);
  return sendSuccess(res, user, 'User created successfully');
});
```

## 📋 Code Review Checklist

### Before Submitting Code
- [ ] Searched for existing similar functionality
- [ ] Used existing utility functions where applicable
- [ ] Followed standardized controller/service patterns
- [ ] Used response utilities for all API responses
- [ ] Validated inputs using validation utilities
- [ ] Added appropriate error handling
- [ ] Updated documentation if adding new endpoints
- [ ] No duplicate logic or endpoints

### During Code Review
- [ ] Architecture pattern consistency maintained
- [ ] DRY principles followed
- [ ] Proper separation of concerns (Controller → Service → Model)
- [ ] Error handling follows established patterns
- [ ] Input validation implemented
- [ ] Documentation updated

## 🔍 Quick Reference Commands

### Check for Duplicates
```bash
# Find similar endpoints
grep -r "router\.get.*users" src/routes/
grep -r "router\.post.*transactions" src/routes/

# Find similar validation patterns
grep -r "req\.body\." src/controllers/
grep -r "status.*400" src/controllers/

# Find similar service functions
grep -r "export const.*User" src/services/
grep -r "sequelize\.query" src/services/
```

### Check Architecture Compliance
```bash
# Find mixed patterns
grep -r "export class.*Controller" src/controllers/
grep -r "export const.*Controller.*=" src/controllers/

# Find direct model access in controllers
grep -r "Model\.\(create\|findOne\|findAll\)" src/controllers/
```

## 📖 Required Reading

1. **Backend Inventory**: `BACKEND_INVENTORY.md` - Complete structure overview
2. **API Documentation**: `openapi.yaml` - All existing endpoints
3. **Response Utils**: `src/utils/responseUtils.ts` - Standardized responses
4. **Validation Utils**: `src/utils/validationUtils.ts` - Common validations
5. **Query Utils**: `src/utils/queryUtils.ts` - Database helpers

## 🎓 Onboarding Steps

1. **Read** the complete backend inventory
2. **Understand** existing architecture patterns
3. **Practice** using utility functions in a test feature
4. **Submit** first PR following all guidelines
5. **Get** code review focusing on DRY compliance

## 🚨 Common Violations

1. **Creating duplicate endpoints** without checking existing routes
2. **Mixing controller patterns** (class vs function exports)
3. **Duplicating validation logic** instead of using utilities
4. **Direct model access** from controllers
5. **Inconsistent error responses** not using response utilities
6. **Missing service layer** for business logic

Following these guidelines ensures our codebase remains **organized, maintainable, and DRY**.