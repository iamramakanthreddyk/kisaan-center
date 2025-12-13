> ✅ **Active**: Primary engineering standards & conventions reference.

# Development Rulebook - Market Management System

## 🎯 Overview
This document establishes development standards, best practices, and guidelines for the Market Management System project.

---

## 🔴 CRITICAL RULE #1: REUSE BEFORE CREATE

### The "No Duplicate Files" Policy

**BEFORE creating ANY new file (script, migration, documentation), you MUST:**

1. **CHECK EXISTING FILES FIRST** using the project index:
   - `docs/DOCS_STATUS.md` - All documentation files with deprecation status
   - `docs/DEPRECATED_SCRIPTS.md` - Deprecated/removed scripts and their replacements
   - `kisaan-backend-node/scripts/` - Active utility scripts
   - `scripts/` - Root-level operational scripts
   - `kisaan-backend-node/src/migrations/` - Database migrations

2. **REFACTOR EXISTING FILES** instead of creating new ones:
   - ✅ Update existing migration files
   - ✅ Extend existing scripts with new functions
   - ✅ Add sections to existing documentation
   - ❌ DO NOT create `file-v2.sql`, `file-new.sql`, `file-fixed.sql`

3. **USE CANONICAL COMMANDS**:
   ```bash
   # Schema management
   npm run schema:prepare       # Apply complete schema
   npm run schema:structure     # Verify schema
   
   # Seeding
   npm run features:seed        # Feature flags (idempotent)
   npm run db:bootstrap         # Initial data
   
   # Migrations
   npm run migrate              # Run pending migrations
   npm run migrate:transactions:rename  # Specific migration
   
   # Cleanup
   npm run cleanup:deprecated   # Remove old files
   ```

4. **NAMING CONVENTIONS FOR NEW FILES** (only if truly needed):
   - Migrations: `YYYYMMDD_NN_descriptive_name.sql` (e.g., `20251027_01_add_constraints.sql`)
   - Scripts: `action-subject.ts` (e.g., `validate-balances.ts`)
   - Docs: `SUBJECT_PURPOSE.md` (e.g., `BALANCE_VALIDATION_GUIDE.md`)
   - ❌ NEVER: `temp.sql`, `fix.js`, `new-script.ts`, `updated.md`

### Why This Matters
- Prevents script bloat (96 scripts currently exist!)
- Avoids conflicting logic in duplicate files
- Makes maintenance impossible when changes exist in multiple places
- Wastes time searching for "which version is correct?"

### Enforcement
- All PRs will be rejected if they create duplicate files
- Use `git status` to check what you're creating
- Run `npm run cleanup:deprecated` before committing

---

## 📁 Project Structure Standards

### Directory Organization
```
backend/
├── src/
│   ├── api/                    # API layer
│   │   └── endpoints/          # Route handlers
│   ├── core/                   # Application core
│   │   ├── config.py          # Configuration management
│   │   ├── security.py        # Authentication & authorization
│   │   ├── logging.py         # Logging configuration
│   │   └── exceptions.py      # Custom exceptions
│   ├── crud/                   # Database operations (CRUD)
│   ├── database/               # Database management
│   │   ├── models.py          # SQLAlchemy models
│   │   └── __init__.py        # DB manager & connections
│   ├── schemas/                # Pydantic schemas (Request/Response)
│   ├── services/               # Business logic layer
│   └── main.py                # FastAPI application entry point
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── test setup/fixtures    # Test framework setup (Jest configuration or project fixtures)
└── docs/                      # Documentation
    ├── api/                   # API documentation
    ├── architecture/          # System architecture docs
    └── deployment/           # Deployment guides
```

### 🚫 DO NOT Do This
- ❌ Place business logic in API endpoints
- ❌ Mix database operations with API logic
- ❌ Create circular imports
- ❌ Put configuration values directly in code
- ❌ Skip error handling
- ❌ Write untested code
- ❌ Commit without running tests
- ❌ Use hard-coded database connections

### ✅ DO This
- ✅ Follow the layered architecture pattern
- ✅ Use dependency injection
- ✅ Write comprehensive tests
- ✅ Document all public APIs
- ✅ Use type hints everywhere
- ✅ Handle errors gracefully
- ✅ Log important operations

---

## 🏗️ Architecture Patterns

### Layered Architecture
Follow this strict separation of concerns:

1. **API Layer** (`api/endpoints/`)
   - Route definitions
   - Request/response handling
   - Authentication/authorization checks
   - Input validation (basic)

2. **Service Layer** (`services/`)
   - Business logic implementation
   - Complex validation rules
   - Transaction orchestration
   - External service integration

3. **CRUD Layer** (`crud/`)
   - Direct database operations
   - Query optimization
   - Database-specific logic
   - No business rules here

4. **Models** (`database/models.py`)
   - Database schema definitions
   - Relationships
   - Constraints
   - No business logic

### Data Flow
```
API Endpoint → Service → CRUD → Database
     ↓           ↓        ↓
  Validation → Business → Data
              Rules    Access
```

---

## 🔧 Coding Standards

### Node / TypeScript Style
- Use a consistent linter/formatter (ESLint + Prettier recommended)
- TypeScript type annotations on public functions and interfaces
- TSDoc comments for public functions where helpful
- Maximum line length: follow project conventions (100-120 chars)

### Example Function (TypeScript)
```ts
async function createUser(
  userData: UserCreate,
  currentUserId: number,
  db: DbSession
): Promise<User> {
  /**
   * Create a new user with role-based validation.
   *
   * Args:
   *   userData: User creation data
   *   currentUserId: ID of user performing the operation
   *   db: Database session
   *
   * Returns:
   *   Created user object
   */
  // Implementation here
}
```

### Error Handling
```python
# ❌ Wrong
def get_user(user_id: int):
    user = db.query(User).get(user_id)
    return user  # Could return None without warning

# ✅ Correct
def get_user(user_id: int, db: Session) -> User:
    """Get user by ID."""
    user = db.query(User).get(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    return user
```

---

## 🗄️ Database Standards

### Model Definitions
```python
# ✅ Good model structure
class User(Base):
    __tablename__ = 'users'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Required fields
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    
    # Optional fields with defaults
    credit_limit = Column(DECIMAL(12,2), default=0.00)
    status = Column(Enum(RecordStatus), default=RecordStatus.ACTIVE)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shop = relationship('Shop', back_populates='users')
```

### Database Operations
```python
# ✅ Use transactions for multi-step operations
async def create_transaction_with_items(
    transaction_data: TransactionCreate,
    db: Session
) -> Transaction:
    """Create transaction with items atomically."""
    try:
        # Create main transaction
        transaction = Transaction(**transaction_data.dict(exclude={'items'}))
        db.add(transaction)
        db.flush()  # Get ID without committing
        
        # Create transaction items
        for item_data in transaction_data.items:
            item = TransactionItem(
                transaction_id=transaction.id,
                **item_data.dict()
            )
            db.add(item)
        
        db.commit()
        return transaction
        
    except Exception:
        db.rollback()
        raise
```

---

## 🧪 Testing Standards

### Test Structure
```
tests/
├── unit/                      # Fast, isolated tests
│   ├── test_user_service.py   # Service layer tests
│   ├── test_user_crud.py      # CRUD layer tests
│   └── test_models.py         # Model tests
├── integration/               # Slower, end-to-end tests
│   ├── test_user_api.py       # API endpoint tests
│   └── test_transaction_flow.py
└── conftest.py               # Shared fixtures
```

### Test Examples
```python
# Unit test example
def test_user_service_create_user():
    """Test user creation with valid data."""
    # Given
    user_data = UserCreate(
        username="test_user",
        role=UserRole.FARMER,
        password="secure_password"
    )
    
    # When
    result = user_service.create_user(user_data, current_user_id=1, db=db)
    
    # Then
    assert result.username == "test_user"
    assert result.role == UserRole.FARMER
    assert result.password_hash is not None

# Integration test example
def test_create_user_endpoint(client, auth_headers):
    """Test user creation via API."""
    # Given
    user_data = {
        "username": "api_test_user",
        "role": "farmer",
        "password": "secure_password"
    }
    
    # When
    response = client.post("/api/v1/users", json=user_data, headers=auth_headers)
    
    # Then
    assert response.status_code == 201
    assert response.json()["username"] == "api_test_user"
```

### Coverage Requirements
- **Minimum coverage**: 90%
- **Critical paths**: 100% coverage required
- **New features**: Must include tests

---

## 🔐 Security Standards

### Authentication & Authorization
```python
# ✅ Always use dependency injection for auth
@router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user_id: str = Depends(get_current_user_id),  # Required
    db: Session = Depends(get_db)
):
    # Implementation
```

### Input Validation
```python
# ✅ Use Pydantic schemas for validation
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: UserRole
    contact: Optional[str] = Field(None, regex=r'^\+?1?\d{9,15}$')
```

### Password Handling
```python
# ✅ Always hash passwords
password_hash = SecurityUtils.hash_password(plain_password)

# ✅ Never log sensitive data
logger.info(f"User created: {user.username}")  # Good
logger.info(f"Password: {password}")  # ❌ NEVER DO THIS
```

---

## 📝 Documentation Standards

### API Documentation
- **OpenAPI/Swagger** auto-generation required
- **Detailed descriptions** for all endpoints
- **Request/response examples** for complex endpoints
- **Error response** documentation

### Code Documentation
```python
def calculate_commission(
    transaction_amount: Decimal,
    commission_rate: Decimal,
    product_category: str
) -> Decimal:
    """
    Calculate commission for a transaction.
    
    Applies tiered commission rates based on transaction amount
    and product category-specific multipliers.
    
    Args:
        transaction_amount: Total transaction value in currency units
        commission_rate: Base commission rate (0.0 to 1.0)
        product_category: Product category for rate adjustments
        
    Returns:
        Calculated commission amount
        
    Raises:
        ValidationError: If rate is outside valid range
        
    Examples:
        >>> calculate_commission(Decimal('1000'), Decimal('0.05'), 'grains')
        Decimal('50.00')
    """
```

---

## 🚀 Deployment Standards

### Environment Configuration
```python
# ✅ Use environment-specific settings
class Settings(BaseSettings):
    # Development defaults
    DEBUG: bool = False
    DATABASE_URL: str = Field(..., env='DATABASE_URL')
    SECRET_KEY: str = Field(..., env='SECRET_KEY')
    
    class Config:
        env_file = '.env'
```

### Health Checks
```python
# ✅ Implement comprehensive health checks
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected" if db_manager.test_connection() else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## 🔄 Development Workflow

### Git Workflow
1. **Create feature branch** from `main`
2. **Make focused commits** with clear messages
3. **Write/update tests** for changes
4. **Run full test suite** before pushing
5. **Create pull request** with description
6. **Code review** required before merge

### Commit Messages
```
feat(user): add user creation endpoint

- Implement POST /api/v1/users endpoint
- Add input validation with Pydantic
- Include role-based authorization checks
- Add comprehensive error handling

Closes #123
```

### Pre-commit Checklist
- [ ] Tests pass (project test runner - `npm test` / `jest`)
- [ ] Code formatted (`black .`)
- [ ] Imports sorted (`isort .`)
- [ ] Type checking passes (`mypy`)
- [ ] Linting passes (`flake8`)
- [ ] Documentation updated

---

## 📊 Performance Standards

### Database Query Optimization
```python
# ❌ N+1 query problem
users = db.query(User).all()
for user in users:
    print(user.shop.name)  # Causes additional query per user

# ✅ Use eager loading
users = db.query(User).options(joinedload(User.shop)).all()
for user in users:
    print(user.shop.name)  # Single query
```

### Response Time Requirements
- **API endpoints**: < 200ms average
- **Database queries**: < 100ms average
- **Heavy operations**: Use background tasks

---

## 🐛 Error Handling Standards

### Exception Hierarchy
```python
# Custom exceptions with context
class BusinessLogicError(KisaanCenterException):
    def __init__(self, message: str, rule: str = None):
        super().__init__(message, "BUSINESS_LOGIC_ERROR")
        if rule:
            self.details["violated_rule"] = rule
```

### Error Responses
```json
{
  "success": false,
  "message": "User not found",
  "error_code": "NOT_FOUND",
  "details": {
    "resource": "User",
    "identifier": "123"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

---

## 📈 Monitoring & Logging

### Logging Standards
```python
# ✅ Structured logging with context
logger.info(
    "User created successfully",
    extra={
        "user_id": user.id,
        "created_by": current_user_id,
        "shop_id": user.shop_id
    }
)

# ✅ Error logging with full context
logger.error(
    "Failed to create user",
    extra={
        "username": user_data.username,
        "error": str(e)
    },
    exc_info=True
)
```

### Metrics to Track
- **API response times**
- **Database query performance**
- **Error rates**
- **User activity**
- **Business KPIs**

---

## 🔄 Maintenance Standards

### Code Reviews
- **Required for all changes**
- **Focus on**:
  - Code correctness
  - Performance implications
  - Security considerations
  - Test coverage
  - Documentation

### Refactoring Guidelines
- **Boy Scout Rule**: Leave code cleaner than you found it
- **Single Responsibility Principle**: One reason to change
- **DRY Principle**: Don't repeat yourself
- **YAGNI**: You ain't gonna need it

---

## 📚 Learning Resources

### Required Reading
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)

### Recommended Books
- "Clean Code" by Robert C. Martin
- "Effective Python" by Brett Slatkin
- "Building APIs with Python and FastAPI" by Abdulazeez Abdulazeez

---

## 🆘 Getting Help

### Internal Resources
- **Technical Lead**: For architecture decisions
- **Senior Developers**: For code reviews and mentoring
- **DevOps Team**: For deployment and infrastructure

### External Resources
- **Stack Overflow**: For specific technical questions
- **GitHub Issues**: For library-specific problems
- **Documentation**: Always check official docs first

---

*This rulebook is a living document. All team members are expected to follow these guidelines and contribute to improvements.*
