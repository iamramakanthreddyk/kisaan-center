# 🏗️ KISAAN CENTER BACKEND ARCHITECTURE
## Clean Architecture Implementation Guide

> **START HERE**: This is your architectural blueprint. Follow these rules religiously for maintainable, scalable code.

---

## 🎯 CORE PRINCIPLES

### 1. **Strict Layer Separation**
```
API Layer (Routes) → Controller Layer → Service Layer → Repository Layer → Database
```
- **Never skip layers** - API cannot call Service directly
- **Never call backwards** - Service cannot call Controller
- **Single Responsibility** - Each layer has one job only

### 2. **Dependency Flow**
```
Routes ← Controllers ← Services ← Repositories ← Models
```
- **Inward dependencies only** - Outer layers depend on inner layers
- **Interface-based** - Use abstractions, not concrete implementations
- **Dependency Injection** - Services are injected, not imported directly

### 3. **Data Flow**
```
Request → DTO → Domain Entity → Database Entity → Response
```
- **Type Safety** - Strict typing at every boundary
- **Validation** - At API and Service layers
- **Transformation** - Clear data mapping between layers

---

## 📁 DIRECTORY STRUCTURE

```
src/
├── 🌐 api/                     # API Layer (Routes)
│   ├── routes/                 # Route definitions
│   ├── middleware/             # Request/Response middleware
│   └── validators/             # Input validation schemas
│
├── 🎮 controllers/             # Controller Layer
│   ├── base/                   # Base controller classes
│   ├── interfaces/             # Controller contracts
│   └── [entity]Controller.ts  # Specific controllers
│
├── 🔧 services/                # Service Layer (Business Logic)
│   ├── base/                   # Base service classes
│   ├── interfaces/             # Service contracts
│   └── [entity]Service.ts     # Business logic implementations
│
├── 🗄️ repositories/            # Repository Layer (Data Access)
│   ├── base/                   # Base repository classes
│   ├── interfaces/             # Repository contracts
│   └── [entity]Repository.ts  # Data access implementations
│
├── 🏗️ database/                # Database Layer
│   ├── models/                 # Sequelize models (DB schema)
│   ├── migrations/             # Database migrations
│   ├── seeders/               # Database seeders
│   └── config/                # Database configuration
│
├── 📦 domain/                  # Domain Layer (Business Entities)
│   ├── entities/               # Business entities (pure classes)
│   ├── value-objects/          # Value objects
│   └── interfaces/             # Domain contracts
│
├── 🔄 shared/                  # Shared Components
│   ├── utils/                  # Pure utility functions
│   ├── helpers/                # Application helpers
│   ├── constants/              # Application constants
│   ├── types/                  # TypeScript type definitions
│   ├── dtos/                   # Data Transfer Objects
│   └── exceptions/             # Custom exception classes
│
├── 🔌 infrastructure/          # Infrastructure Layer
│   ├── external/               # External service integrations
│   ├── storage/                # File storage implementations
│   └── messaging/              # Event/message handling
│
└── 📋 core/                    # Core Application
    ├── application.ts          # Application bootstrap
    ├── container.ts            # Dependency injection container
    └── config/                 # Application configuration
```

---

## 🔥 IMPLEMENTATION RULES

### **API Layer Rules**
```typescript
// ✅ GOOD - Route only handles HTTP concerns
router.get('/users/:id', async (req, res, next) => {
  const result = await userController.getById(req, res, next);
});

// ❌ BAD - Route contains business logic
router.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user.isActive) { ... }
});
```

### **Controller Layer Rules**
```typescript
// ✅ GOOD - Controller orchestrates, doesn't implement logic
async getById(req: Request, res: Response): Promise<void> {
  const userId = this.parseId(req.params.id);
  const user = await this.userService.getById(userId);
  this.sendSuccess(res, user);
}

// ❌ BAD - Controller contains business logic
async getById(req: Request, res: Response): Promise<void> {
  const user = await User.findByPk(req.params.id);
  if (user.shop_id !== req.user.shop_id) throw new Error('Access denied');
});
```

### **Service Layer Rules**
```typescript
// ✅ GOOD - Service contains business logic
async getById(id: number, requestUser: User): Promise<UserEntity> {
  this.validateAccess(requestUser, id);
  const user = await this.userRepository.findById(id);
  return this.enrichUserData(user);
}

// ❌ BAD - Service accesses database directly
async getById(id: number): Promise<User> {
  return await User.findByPk(id);
}
```

### **Repository Layer Rules**
```typescript
// ✅ GOOD - Repository only handles data access
async findById(id: number): Promise<UserEntity | null> {
  const user = await this.model.findByPk(id, { include: ['shop'] });
  return user ? this.toDomainEntity(user) : null;
}

// ❌ BAD - Repository contains business logic
async findById(id: number): Promise<User | null> {
  const user = await this.model.findByPk(id);
  if (user.isActive) user.lastAccessed = new Date();
  return user;
}
```

---

## 🛠️ BASE CLASSES

### **Base Repository**
```typescript
abstract class BaseRepository<TModel, TEntity> {
  protected abstract model: ModelStatic<TModel>;
  protected abstract toDomainEntity(model: TModel): TEntity;
  protected abstract toModelData(entity: TEntity): any;
  
  async findById(id: number): Promise<TEntity | null> { ... }
  async create(entity: TEntity): Promise<TEntity> { ... }
  async update(id: number, entity: Partial<TEntity>): Promise<TEntity> { ... }
  async delete(id: number): Promise<void> { ... }
}
```

### **Base Service**
```typescript
abstract class BaseService<TEntity, TCreateDTO, TUpdateDTO> {
  protected abstract repository: BaseRepository<any, TEntity>;
  
  async getById(id: number): Promise<TEntity> { ... }
  async create(dto: TCreateDTO): Promise<TEntity> { ... }
  async update(id: number, dto: TUpdateDTO): Promise<TEntity> { ... }
  async delete(id: number): Promise<void> { ... }
}
```

### **Base Controller**
```typescript
abstract class BaseController {
  protected parseId(value: string): number { ... }
  protected sendSuccess(res: Response, data: any): void { ... }
  protected sendError(res: Response, error: string): void { ... }
  protected validateRequired(obj: any, fields: string[]): void { ... }
}
```

---

## 📋 DEVELOPMENT WORKFLOW

### **Adding New Feature**
1. **Define Domain Entity** in `domain/entities/`
2. **Create Database Model** in `database/models/`
3. **Build Repository** in `repositories/`
4. **Implement Service** in `services/`
5. **Create Controller** in `controllers/`
6. **Add Routes** in `api/routes/`
7. **Write Tests** for each layer

### **Modifying Existing Feature**
1. **Identify Layer** where change belongs
2. **Update Tests** first (TDD approach)
3. **Modify Implementation** in correct layer only
4. **Verify Layer Boundaries** not violated
5. **Update Documentation** if interfaces change

---

## 🚨 FORBIDDEN PATTERNS

### **❌ NEVER DO THIS**
```typescript
// Routes calling services directly
router.get('/users', async (req, res) => {
  const users = await userService.getAll(); // ❌ Skip controller
});

// Controllers accessing database
class UserController {
  async getUsers() {
    const users = await User.findAll(); // ❌ Skip service layer
  }
}

// Services mixing concerns
class UserService {
  async getUsers(req: Request, res: Response) { // ❌ HTTP in service
    const users = await User.findAll();
    res.json(users); // ❌ Response in service
  }
}

// Cross-layer imports
import UserController from '../controllers/UserController'; // ❌ In service
import UserService from '../services/UserService'; // ❌ In repository
```

### **✅ ALWAYS DO THIS**
```typescript
// Proper dependency injection
class UserController extends BaseController {
  constructor(private userService: IUserService) { }
}

// Interface-based dependencies
interface IUserService {
  getById(id: number): Promise<UserEntity>;
}

// Clear data transformation
const userDTO = UserMapper.toDTO(userEntity);
```

---

## 🎯 QUALITY GATES

### **Code Review Checklist**
- [ ] Layer boundaries respected
- [ ] No direct database access in controllers
- [ ] No HTTP concerns in services
- [ ] Proper error handling at each layer
- [ ] DTOs used for data transfer
- [ ] Interfaces defined for dependencies
- [ ] Tests cover each layer independently

### **Architecture Validation**
- [ ] Can test business logic without HTTP
- [ ] Can test data access without business logic
- [ ] Can swap implementations without breaking consumers
- [ ] Dependencies flow inward only
- [ ] Each layer has single responsibility

---

## 📚 NAMING CONVENTIONS

### **Files & Classes**
- **Routes**: `userRoutes.ts`, `productRoutes.ts`
- **Controllers**: `UserController.ts`, `ProductController.ts`
- **Services**: `UserService.ts`, `ProductService.ts`
- **Repositories**: `UserRepository.ts`, `ProductRepository.ts`
- **Models**: `User.ts`, `Product.ts` (database models)
- **Entities**: `UserEntity.ts`, `ProductEntity.ts` (domain entities)
- **DTOs**: `CreateUserDTO.ts`, `UpdateUserDTO.ts`

### **Methods**
- **Controllers**: `getById()`, `create()`, `update()`, `delete()`
- **Services**: `getById()`, `create()`, `update()`, `delete()`, `validateBusinessRule()`
- **Repositories**: `findById()`, `create()`, `update()`, `delete()`, `findByCondition()`

---

## 🚀 GETTING STARTED

### **1. Read This Document** 📖
Understand every principle before coding

### **2. Follow Examples** 👥
Look at existing implementations that follow these patterns

### **3. Use Base Classes** 🏗️
Extend base classes, don't reinvent

### **4. Test Layer Boundaries** 🧪
Write tests that verify separation

### **5. Review Regularly** 🔍
Check code follows architectural principles

---

**Remember**: This architecture is designed for **long-term maintainability** and **team scalability**. Short-term convenience should never compromise architectural integrity.

**When in doubt**: Ask "Which layer is responsible for this concern?" and implement there only.