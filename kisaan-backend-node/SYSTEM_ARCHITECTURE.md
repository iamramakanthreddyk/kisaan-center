# KisaanCenter Backend - System Architecture Documentation

## 📋 **Table of Contents**
1. [Database Schema](#database-schema)
2. [Models & Relationships](#models--relationships)
3. [API Endpoints](#api-endpoints)
4. [Controllers & Services](#controllers--services)
5. [Folder Structure](#folder-structure)
6. [Security & Validation](#security--validation)

---

## 🗄️ **Database Schema**

### **Core Tables**

#### **1. kisaan_users**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- username (VARCHAR(50), UNIQUE, NOT NULL)
- password (VARCHAR(255), NOT NULL)
- email (VARCHAR(100), UNIQUE)
- contact (VARCHAR(15))
- role (ENUM: 'superadmin', 'admin', 'owner', 'farmer', 'buyer')
- owner_id (VARCHAR(50))
- shop_id (BIGINT, FK → kisaan_shops.id)
- balance (DECIMAL(12,2), DEFAULT 0.00)
- status (ENUM: 'active', 'inactive', DEFAULT 'active')
- created_at, updated_at (TIMESTAMP)
```

#### **2. kisaan_shops**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- name (VARCHAR(255), NOT NULL)
- owner_id (VARCHAR(50), NOT NULL)
- category_id (BIGINT, FK → kisaan_categories.id, NULLABLE)
- plan_id (BIGINT, FK → kisaan_plans.id, NULLABLE)
- address (TEXT)
- contact (VARCHAR(15))
- commission_rate (DECIMAL(5,2), DEFAULT 10.00)
- status (ENUM: 'active', 'inactive', DEFAULT 'active')
- created_at, updated_at (TIMESTAMP)
```

#### **3. kisaan_categories**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- name (VARCHAR(100), UNIQUE, NOT NULL)
- description (TEXT)
- is_active (BOOLEAN, DEFAULT true)
- created_at, updated_at (TIMESTAMP)

-- Predefined Categories: Flowers, Fruits, Vegetables, Grains
```

#### **4. kisaan_products**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- name (VARCHAR(100), NOT NULL)
- category_id (BIGINT, FK → kisaan_categories.id, NOT NULL)
- description (TEXT, NULLABLE)
- price (DECIMAL(10,2), NULLABLE)
- shop_id (BIGINT, NULLABLE)
- record_status (VARCHAR(20), NULLABLE)
- unit (VARCHAR(20), NULLABLE)
- created_at, updated_at (TIMESTAMP)
```

### **Transaction & Payment Tables (Clean Model)**

#### **5. kisaan_transactions** ⭐ **CORE**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- shop_id (BIGINT, FK → kisaan_shops.id, NOT NULL)
- farmer_id (BIGINT, FK → kisaan_users.id, NOT NULL)
- buyer_id (BIGINT, FK → kisaan_users.id, NOT NULL)
- category_id (BIGINT, FK → kisaan_categories.id, NOT NULL)
- product_name (VARCHAR(255), NOT NULL)
- quantity (DECIMAL(12,2), NOT NULL)
- unit_price (DECIMAL(12,2), NOT NULL)
- total_sale_value (DECIMAL(12,2), NOT NULL)
- shop_commission (DECIMAL(12,2), NOT NULL)
- farmer_earning (DECIMAL(12,2), NOT NULL)
- created_at, updated_at (TIMESTAMP)
```

#### **6. kisaan_payments** ⭐ **CORE**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- transaction_id (BIGINT, FK → kisaan_transactions.id, NOT NULL)
- payer_type (ENUM: 'BUYER', 'SHOP', NOT NULL)
- payee_type (ENUM: 'SHOP', 'FARMER', NOT NULL)
- amount (DECIMAL(12,2), NOT NULL)
- status (ENUM: 'PENDING', 'PAID', 'FAILED', DEFAULT 'PENDING')
- payment_date (TIMESTAMP, NULLABLE)
- method (ENUM: 'CASH', 'BANK', 'UPI', 'OTHER', NOT NULL)
- notes (TEXT, NULLABLE)
- created_at, updated_at (TIMESTAMP)
```

### **Supporting Tables**

#### **7. kisaan_shop_categories** (Many-to-Many)
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- shop_id (BIGINT, FK → kisaan_shops.id, NOT NULL)
- category_id (BIGINT, FK → kisaan_categories.id, NOT NULL)
- created_at, updated_at (TIMESTAMP)
- UNIQUE(shop_id, category_id)
```

#### **8. kisaan_plans**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- name (VARCHAR(100), UNIQUE, NOT NULL)
- description (TEXT)
- price (DECIMAL(10,2), NOT NULL)
- billing_cycle (ENUM: 'monthly', 'yearly', NOT NULL)
- features (JSON, NULLABLE)
- is_active (BOOLEAN, DEFAULT true)
- created_at, updated_at (TIMESTAMP)
```

#### **9. kisaan_commissions**
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- shop_id (BIGINT, FK → kisaan_shops.id, NOT NULL)
- rate (DECIMAL(5,2), NOT NULL)
- type (ENUM: 'percentage', 'fixed', DEFAULT 'percentage')
- created_at, updated_at (TIMESTAMP)
```

---

## 🔗 **Models & Relationships**

### **Model Files Structure**
```
src/models/
├── index.ts           # Central model registry & associations
├── user.ts           # User model
├── shop.ts           # Shop model  
├── category.ts       # Category model
├── product.ts        # Product model
├── transaction.ts    # Transaction model (Clean)
├── payment.ts        # Payment model (Clean)
├── shopCategory.ts   # Shop-Category junction
├── plan.ts           # Plan model
├── commission.ts     # Commission model
└── settlement.ts     # Settlement model
```

### **Key Relationships**
```typescript
// Shop-Category (Many-to-Many)
Shop.belongsToMany(Category, { through: ShopCategory })
Category.belongsToMany(Shop, { through: ShopCategory })

// Transaction Relationships
Transaction.belongsTo(Shop, { as: 'shop' })
Transaction.belongsTo(Category, { as: 'category' })
Transaction.hasMany(Payment, { as: 'payments' })

// Payment Relationships  
Payment.belongsTo(Transaction, { as: 'transaction' })

// User-Shop Relationships
User.belongsTo(Shop, { foreignKey: 'shop_id' })
Shop.hasMany(User, { foreignKey: 'shop_id' })
```

---

## 🌐 **API Endpoints**

### **Authentication & Users**
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### **Core Business Entities**
```
# Categories (4 core: Flowers, Fruits, Vegetables, Grains)
GET    /api/categories
POST   /api/categories
GET    /api/categories/:id
PUT    /api/categories/:id
DELETE /api/categories/:id

# Products (Category-based)
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id

# Shops
GET    /api/shops
POST   /api/shops
GET    /api/shops/:id
PUT    /api/shops/:id
DELETE /api/shops/:id
GET    /api/shops/:id/products

# Shop-Category Assignments
POST   /api/shop-categories/assign
POST   /api/shop-categories/remove
GET    /api/shop-categories/shop/:shopId/categories
```

### **Transaction & Payment System** ⭐ **CORE**
```
# Transactions (Clean Model)
GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id
GET    /api/transactions/analytics
GET    /api/transactions/shop/:shopId/list
GET    /api/transactions/farmer/:farmerId/list

# Payments (Cash Flow Tracking)
POST   /api/payments/buyer          # Buyer → Shop
POST   /api/payments/shop           # Shop → Farmer
GET    /api/payments/transaction/:transactionId
GET    /api/payments/outstanding
PATCH  /api/payments/:id/status
```

### **Balance & Commission System**
```
# Balance Management
GET    /api/balance/user/:userId
GET    /api/balance/shop/:shopId
POST   /api/balance/update
GET    /api/balance/history/:userId
POST   /api/balance/payment/farmer
POST   /api/balance/payment/buyer

# Commission Management
GET    /api/commissions
POST   /api/commissions
GET    /api/commissions/shop/:shopId
POST   /api/commissions/calculate
```

### **Reports & Analytics**
```
GET    /api/reports/sales
GET    /api/reports/transactions
GET    /api/settlements
POST   /api/settlements
GET    /api/settlements/summary
```

---

## 🏗️ **Controllers & Services**

### **Controller Architecture**
```
src/controllers/
├── authController.ts         # Authentication logic
├── userController.ts         # User CRUD operations
├── shopController.ts         # Shop management
├── categoryController.ts     # Category management
├── productController.ts      # Product management
├── transactionController.ts  # Transaction operations (Clean)
├── paymentController.ts      # Payment operations (Clean)
├── balanceController.ts      # Balance management
├── commissionController.ts   # Commission management
├── settlementController.ts   # Settlement operations
└── reportController.ts       # Analytics & reports
```

### **Service Layer Architecture**
```
src/services/
├── authService.ts           # JWT & authentication
├── userService.ts           # User business logic
├── categoryService.ts       # Category operations
├── productService.ts        # Product operations
├── shopCategoryService.ts   # Shop-category assignments
├── transactionService.ts    # Transaction business logic (Clean)
├── settlementService.ts     # Settlement calculations
└── commissionService.ts     # Commission calculations
```

### **Key Service: TransactionService** ⭐ **CORE**
```typescript
class TransactionService {
  // Create transaction with auto-commission calculation
  static async createTransaction(data: CreateTransactionData): Promise<Transaction>
  
  // Record cash flow between parties
  static async createPayment(data: CreatePaymentData): Promise<Payment>
  
  // Calculate shop earnings (derived from transactions + payments)
  static async getShopEarnings(shopId: number, startDate?: Date, endDate?: Date)
  
  // Calculate farmer earnings (derived calculations)
  static async getFarmerEarnings(farmerId: string, startDate?: Date, endDate?: Date)
  
  // Calculate buyer purchases (derived calculations)
  static async getBuyerPurchases(buyerId: string, startDate?: Date, endDate?: Date)
  
  // Get outstanding payments summary
  static async getOutstandingPayments(shopId?: number)
  
  // Get transaction with payment details
  static async getTransactionWithPayments(transactionId: number)
}
```

---

## 📁 **Folder Structure**

### **Project Structure**
```
kisaan-backend-node/
├── src/
│   ├── config/
│   │   └── database.ts           # Database configuration
│   ├── controllers/              # Request handlers
│   ├── middlewares/              # Authentication, validation, error handling
│   ├── models/                   # Sequelize models & associations
│   ├── routes/                   # API route definitions
│   ├── schemas/                  # Zod validation schemas
│   ├── services/                 # Business logic layer
│   ├── seeders/                  # Database seeders
│   ├── mappers/                  # Data transformation utilities
│   ├── app.ts                    # Express app configuration
│   └── server.ts                 # Server startup
├── tests/
│   ├── integration/              # Integration tests
│   └── unit/                     # Unit tests
├── .env                          # Environment variables
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

### **Naming Conventions**
- **Models**: PascalCase (e.g., `User`, `Transaction`, `ShopCategory`)
- **Controllers**: camelCase with Controller suffix (e.g., `transactionController.ts`)
- **Services**: camelCase with Service suffix (e.g., `transactionService.ts`)
- **Routes**: camelCase with Routes suffix (e.g., `transactionRoutes.ts`)
- **Database Tables**: snake_case with kisaan_ prefix (e.g., `kisaan_transactions`)
- **API Endpoints**: kebab-case (e.g., `/api/shop-categories/assign`)

---

## 🔒 **Security & Validation**

### **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (superadmin, admin, owner, farmer, buyer)
- Protected routes with `authenticateToken` middleware

### **Input Validation**
- Zod schemas for request validation
- SQL injection prevention through Sequelize ORM
- XSS protection through input sanitization

### **Security Issues Identified** ⚠️
1. **Log Injection**: User input logged without sanitization
2. **CSRF Protection**: Missing CSRF tokens on state-changing operations
3. **NoSQL Injection**: Direct user input in database queries
4. **Error Exposure**: Internal error messages exposed to clients
5. **Weak Password Policy**: Minimum password length of 6 characters

### **Recommended Security Fixes**
1. Implement input sanitization for logging
2. Add CSRF protection middleware
3. Validate and sanitize all user inputs
4. Use generic error messages for client responses
5. Strengthen password requirements (min 8 chars + complexity)

---

## ✅ **System Status**

### **✅ Implemented & Working**
- Clean transaction/commission model
- Payment tracking system
- Category-based product filtering
- Shop-category assignments
- Balance management
- Commission calculations
- Authentication & authorization
- Input validation with Zod schemas

### **⚠️ Needs Database Migration**
- New transaction table schema (category_id, product_name fields)
- Payment table creation
- Commission table creation

### **🔧 Integration Tests Status**
- **Current**: 54/60 tests passing (90% success rate)
- **Issues**: Shop categories duplicate assignment, missing route implementations
- **Next**: Update tests for new clean transaction model

---

## 🎯 **Business Logic Summary**

The system implements a **clean, normalized transaction model** where:

1. **Transactions** record sales with auto-calculated commissions
2. **Payments** track actual cash flow between buyers, shops, and farmers  
3. **Earnings** are derived from transactions + payments (no duplicate data)
4. **Categories** determine which products shops can sell
5. **Commissions** are calculated based on shop-specific rates

This architecture ensures **data integrity, auditability, and scalability** for the KisaanCenter marketplace platform.