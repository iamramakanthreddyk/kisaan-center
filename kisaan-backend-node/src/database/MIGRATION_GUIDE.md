/**
 * Model Migration and Standardization Guide
 * Instructions for transitioning from old models to new standardized models
 */

# Database Model Migration Guide

## Overview
This guide outlines the migration from the old model structure to the new standardized, clean architecture-aligned models.

## Key Changes

### 1. Directory Structure
- **Old**: `src/models/` (mixed with other concerns)
- **New**: `src/database/models/` (clear separation)

### 2. Model Standardization

#### User Model Changes
- ✅ **Added**: `lastname` field for complete name handling
- ✅ **Added**: `email` field as required (was optional)
- ✅ **Enhanced**: Role constants from shared constants
- ✅ **Enhanced**: Status validation with enums
- ✅ **Added**: Business logic methods (`isActive()`, `canAccessShop()`, etc.)
- ✅ **Added**: Proper indexes for performance
- ✅ **Added**: Validation rules for all fields

#### Shop Model Changes
- ✅ **Added**: `location` field as required
- ✅ **Added**: `commission_rate` field for business logic
- ✅ **Added**: `settings` JSON field for configuration
- ✅ **Enhanced**: Better validation and constraints
- ✅ **Added**: Business logic methods
- ✅ **Added**: Proper foreign key relationships

#### Product Model Changes
- ✅ **Added**: `unit` field as required
- ✅ **Added**: `base_price` for reference pricing
- ✅ **Added**: `status` field for active/inactive
- ✅ **Added**: `sku` and `barcode` for inventory management
- ✅ **Added**: `specifications` JSON field for product details
- ✅ **Enhanced**: Better indexing and constraints
- ✅ **Added**: Business logic methods

#### Transaction Model Changes
- ✅ **Enhanced**: Better field naming (`total_amount` vs `total_sale_value`)
- ✅ **Added**: `product_id` foreign key reference
- ✅ **Added**: `status` field with proper enum
- ✅ **Added**: `transaction_date` and `settlement_date` separation
- ✅ **Added**: `notes` and `metadata` fields
- ✅ **Added**: Comprehensive validation rules
- ✅ **Added**: Business logic methods
- ✅ **Enhanced**: Better indexing strategy

### 3. Shared Constants Integration
- All models now use constants from `src/shared/constants/`
- Consistent enum values across the application
- Centralized configuration for validation rules

### 4. Business Logic Integration
- Models now include domain-specific methods
- Validation logic embedded in model definitions
- Better separation of data and business concerns

## Migration Steps

### Step 1: Database Schema Updates
Run these SQL migrations to update existing tables:

```sql
-- User table updates
ALTER TABLE kisaan_users 
ADD COLUMN lastname VARCHAR(100) NULL,
ADD COLUMN email VARCHAR(255) NOT NULL UNIQUE,
MODIFY COLUMN firstname VARCHAR(100) NOT NULL;

-- Shop table updates
ALTER TABLE kisaan_shops
ADD COLUMN location VARCHAR(100) NOT NULL,
ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05,
ADD COLUMN settings JSON NULL;

-- Product table updates
ALTER TABLE kisaan_products
ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'kg',
ADD COLUMN base_price DECIMAL(10,2) NULL,
ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
ADD COLUMN sku VARCHAR(50) NULL UNIQUE,
ADD COLUMN barcode VARCHAR(100) NULL UNIQUE,
ADD COLUMN specifications JSON NULL;

-- Transaction table updates
ALTER TABLE kisaan_transactions
ADD COLUMN product_id BIGINT NOT NULL,
ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL,
ADD COLUMN status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
ADD COLUMN transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN settlement_date DATE NULL,
ADD COLUMN notes TEXT NULL,
ADD COLUMN metadata JSON NULL,
RENAME COLUMN total_sale_value TO total_amount,
RENAME COLUMN shop_commission TO commission_amount;
```

### Step 2: Update Import Statements
Replace old model imports:

```typescript
// Old
import { User } from '../models/user';
import { Shop } from '../models/shop';

// New
import { User, Shop } from '../database/models';
```

### Step 3: Update Repository Layer
Use new standardized models in repositories:

```typescript
// Example: UserRepository update
import { User, UserAttributes } from '../database/models';
import { BaseRepository } from './base/BaseRepository';

export class UserRepository extends BaseRepository<User, UserAttributes> {
  constructor() {
    super(User);
  }
  
  // Use new business logic methods
  async findActiveUsers(): Promise<User[]> {
    const users = await this.findAll({ where: { status: 'active' } });
    return users.filter(user => user.isActive());
  }
}
```

### Step 4: Update Service Layer
Leverage new model methods in services:

```typescript
// Example: UserService update
export class UserService extends BaseService<User> {
  async canUserAccessShop(userId: number, shopId: number): Promise<boolean> {
    const user = await this.repository.findById(userId);
    return user?.canAccessShop(shopId) ?? false;
  }
}
```

## Benefits of New Structure

### 1. **Type Safety**
- Comprehensive TypeScript interfaces
- Proper typing for all attributes
- Better IDE support and error detection

### 2. **Business Logic Integration**
- Domain methods embedded in models
- Consistent business rule enforcement
- Better encapsulation of model behavior

### 3. **Performance Optimization**
- Strategic indexing for common queries
- Optimized relationships and associations
- Better query performance

### 4. **Maintainability**
- Centralized constants and validation
- Clear separation of concerns
- Consistent patterns across all models

### 5. **Scalability**
- Easy to extend with new fields
- Flexible JSON fields for future requirements
- Better foundation for microservices transition

## Testing the Migration

### 1. Unit Tests
```typescript
// Test new model methods
describe('User Model', () => {
  it('should check shop access correctly', () => {
    const user = new User({ role: 'owner', shop_id: 1 });
    expect(user.canAccessShop(1)).toBe(true);
    expect(user.canAccessShop(2)).toBe(false);
  });
});
```

### 2. Integration Tests
```typescript
// Test with real database
describe('User Repository', () => {
  it('should create user with new structure', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      firstname: 'Test',
      password: 'hashedpassword'
    };
    
    const user = await userRepository.create(userData);
    expect(user.getFullName()).toBe('Test');
  });
});
```

## Rollback Plan

If issues arise during migration:

1. **Database Rollback**: Keep backup of old schema
2. **Code Rollback**: Git revert to previous model structure  
3. **Data Integrity**: Ensure no data loss during migration
4. **Gradual Migration**: Migrate one model at a time

## Next Steps

1. ✅ Complete model standardization
2. 🔄 Update repository implementations
3. 🔄 Update service layer to use new models
4. 🔄 Update API controllers
5. 🔄 Run comprehensive tests
6. 🔄 Deploy to staging environment
7. 🔄 Performance testing
8. 🔄 Production deployment

## Support

For questions or issues during migration:
- Review ARCHITECTURE_BLUEPRINT.md for patterns
- Check shared constants in `src/shared/constants/`
- Follow clean architecture principles
- Maintain single responsibility for each model