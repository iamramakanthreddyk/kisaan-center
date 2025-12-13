
> ⚠️ **Deprecated (Will be Consolidated)**: Content will be merged into `ARCHITECTURE_BLUEPRINT.md`, `FRONTEND_ARCHITECTURE.md`, and focused domain docs. Use those as primary references.

# KisaanCenter System Brain 🧠
## Single Source of Truth for Database, API, and Frontend Synchronization

---

## 🎯 Purpose
This document serves as the **central brain** that defines:
1. **Repository & Project Structure**
2. **Database Schema** - Authoritative table definitions
3. **API Contracts** - Complete endpoint specifications
4. **Frontend Models** - TypeScript interfaces and data flow
5. **Synchronization Rules** - How changes propagate across layers
6. **Business Logic** - Core business rules and validations
7. **Security Patterns** - Authentication and authorization rules

**RULE**: Before making ANY changes to models, APIs, or frontend, consult this brain first.

---

## �️ Repository Overview

**KisaanCenter** is an enterprise-grade Agricultural Market Management System with a FastAPI backend and React+TypeScript frontend. The system manages market operations including user roles, shop management, transactions, payments, and credit systems.

### Structure
- **backend/**: FastAPI application with SQLAlchemy ORM
- **frontend/**: React+TypeScript application with Vite
- **docs/**: Project documentation
- **.github/**: CI/CD workflows and GitHub Actions
- **logs/**: Application logs
- **uploads/**: File uploads storage
- **backups/**: Database backups

### Environment Configuration
- `.env` and `.env.example` for secrets and connection info

### Setup & Run
-- Backend: `npm --prefix kisaan-backend-node run dev` (Start Node backend as per backend README)
- Frontend: `npm run dev`
- Database migration: `alembic upgrade head`

---

## 📊 Core Entities & Business Rules

### User Business Rules
1. Username must be unique across the system
2. Password must be hashed using SHA256 before storage
3. Superadmin users don't require shop_id
4. All other roles (owner, farmer, buyer, employee) must have shop_id
5. Credit limit can only be set for farmer and buyer roles
6. Only active users can perform transactions
7. User deletion is soft delete (status = INACTIVE)
8. Created_by tracks user creation hierarchy
9. Contact field should follow phone number format validation
10. Role changes require special permissions and validation

### Shop Business Rules
1. Shop name must be unique per owner
2. Owner must be a user with role 'owner'
3. Commission rate must be between 0-100%
4. Shop deletion requires all transactions to be completed
5. Only shop owner can modify shop settings
6. Shop status affects all related entities (users, products, transactions)
7. Plan_id determines feature access and limits
8. Address and contact are optional but recommended
9. Commission rate changes affect future transactions only
10. Shop creation automatically creates default product categories

### Transaction Business Rules
1. Transaction number is auto-generated and unique
2. Total amount = quantity * unit_price
3. Commission amount = total_amount * (commission_rate / 100)
4. Farmer amount = total_amount - commission_amount
5. Three-party completion model: ALL three checkboxes must be true for completion
6. Buyer and farmer must belong to the same shop
7. Product must be available in sufficient quantity
8. Commission rate defaults to shop's commission rate
9. Transaction date cannot be in the future
10. Status progression: PENDING → PROCESSING → COMPLETED/CANCELLED
11. Payment status tracks actual money flow
12. Completion status reflects three-party completion model

### Payment Business Rules
1. Payment amount cannot exceed transaction total amount
2. Multiple partial payments allowed until full amount is paid
3. Payment date cannot be in the future
4. Reference number should be unique per payment method
5. Payment method must be active to accept payments
6. Payment deletion requires special permissions
7. Payment modifications create audit trail
8. Advance payments can exceed transaction amount (for future transactions)
9. Payment status affects transaction payment status
10. Payment method determines validation rules for reference numbers

### Credit Business Rules
1. Outstanding amount = total_amount - paid_amount (auto-calculated)
2. Credit status automatically updates based on payment progress
3. Due date is optional but recommended for tracking
4. Credit can only be created for completed transactions
5. Buyer credit limit must not be exceeded
6. Credit details track farmer-specific portions
7. Partial payments update both credit and credit_details
8. Credit completion triggers transaction payment status update
9. Overdue credits generate alerts and reports
10. Credit deletion requires all payments to be reversed

---

## 🔄 Synchronization & Validation Rules

### Database → API → Frontend Mapping

#### SQLAlchemy → Pydantic → TypeScript

| SQLAlchemy Column Type | Pydantic Field Type | TypeScript Type |
|-----------------------|---------------------|----------------|
| Integer               | int                 | number         |
| String(n)             | str                 | string         |
| Text                  | Optional[str]       | string/null    |
| DECIMAL(m,n)          | Decimal             | number         |
| DateTime              | datetime            | string (ISO)   |
| Date                  | date                | string (ISO)   |
| Boolean               | bool                | boolean        |
| Enum(EnumClass)       | EnumClass           | EnumClass      |
| JSON                  | Dict[str, Any]      | object         |

#### Foreign Key & Relationship Mapping

- One-to-Many: List type with forward reference
    - SQLAlchemy: `shops = relationship('Shop', back_populates='owner')`
    - Pydantic: `owned_shops: List[ShopRead] = []`
    - TypeScript: `ownedShops: Shop[]`

- Many-to-One: Optional single object
    - SQLAlchemy: `shop = relationship('Shop', back_populates='users')`
    - Pydantic: `shop: Optional[ShopRead] = None`
    - TypeScript: `shop?: Shop`

- Foreign Key fields must be included in base schemas
    - SQLAlchemy: `shop_id = Column(Integer, ForeignKey('shop.id'))`
    - Pydantic: `shop_id: int`
    - TypeScript: `shopId: number`

#### Computed Properties

- SQLAlchemy: `@hybrid_property def full_name(self): ...`
- Pydantic: `full_name: Optional[str] = Field(None, description="Computed full name")`
- TypeScript: `fullName?: string`

#### Enum Mapping

- Python:
    ```python
    class UserRole(str, Enum):
            SUPERADMIN = "superadmin"
            OWNER = "owner"
            FARMER = "farmer"
            BUYER = "buyer"
            EMPLOYEE = "employee"
    ```
- TypeScript:
    ```ts
    export enum UserRole {
        SUPERADMIN = 'superadmin',
        OWNER = 'owner',
        FARMER = 'farmer',
        BUYER = 'buyer',
        EMPLOYEE = 'employee'
    }
    ```

#### API Response Structure

```ts
interface APIResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}
```

#### Validation Propagation

- Database constraints → Pydantic validation → Frontend validation
    - SQLAlchemy: `username = Column(String(50), unique=True, nullable=False)`
    - Pydantic: `username: str = Field(..., min_length=3, max_length=50)`
    - Frontend (Zod): `z.string().min(3).max(50)`

---

## 🔒 Security & Permissions

### JWT Token Structure
```json
{
    "user_id": 123,
    "username": "farmer_john",
    "role": "farmer",
    "shop_id": 1,
    "exp": 1640995200
}
```

### Role-Based Permissions Matrix
```python
PERMISSIONS = {
        "superadmin": ["*"],  # All permissions
        "owner": [
                "shop:read", "shop:update",
                "user:create", "user:read", "user:update", "user:delete",
                "product:*", "transaction:*", "payment:*", "credit:*"
        ],
        "employee": [
                "user:read", "product:read", "transaction:create", 
                "transaction:read", "payment:create", "payment:read"
        ],
        "farmer": [
                "stock:create", "stock:read", "stock:update",
                "transaction:read", "payment:read"
        ],
        "buyer": [
                "product:read", "transaction:create", "transaction:read",
                "payment:create", "payment:read", "credit:read"
        ]
}
```

---

## 🧩 Change Propagation & Checklist

### Step-by-step process:
1. Design database schema changes
2. Update this BRAIN document
3. Create/update SQLAlchemy models
4. Create Alembic migration
5. Update/create Pydantic schemas
6. Update/create API endpoints
7. Update/create services
8. Update/create TypeScript interfaces
9. Update/create frontend components
10. Write tests for all layers
11. Update documentation

### MANDATORY CHECKLISTS
- Update SQLAlchemy models
- Create Alembic migration
- Update Pydantic schemas
- Update TypeScript interfaces
- Update API documentation
- Update frontend types
- Run full test suite
- Update this BRAIN document
- Update endpoint signatures
- Update request/response schemas
- Update OpenAPI documentation
- Update frontend API calls
- Update error handling
- Test backward compatibility
- Update integration tests
- Verify API contract compatibility
- Update TypeScript interfaces
- Update form validations
- Update state management
- Test data flow end-to-end
- Update component tests

---

## 🏥 System Health & KPIs

- Database connection status
- API response times
- Frontend bundle size
- Error rates by endpoint
- User session metrics
- Transaction processing time
- Database query performance
- API endpoint response times
- Frontend page load times
- Memory usage patterns

---

## 🛡️ Validation & Scaling

- Foreign key consistency
- Calculated field accuracy
- Business rule compliance
- Data synchronization status
- Backup integrity
- Database sharding strategy
- API load balancing
- Frontend CDN optimization
- Caching layer implementation
- Microservices migration path

---

## 🚀 Planned Enhancements

- Real-time notifications
- Advanced analytics dashboard
- Mobile application
- Third-party integrations
- Multi-language support

---

## ⚙️ Configuration Settings

LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@kisaancenter.com

# Redis Configuration (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Backup Configuration
BACKUP_DIR=backups
BACKUP_RETENTION_DAYS=30
AUTO_BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM

---

## 🧰 Maintenance Tasks

```python
def run_maintenance_tasks():
    """Run all maintenance tasks"""
    db = SessionLocal()
    try:
        logger.info("Starting maintenance tasks...")
        
        # Database cleanup
        cleanup_old_transactions(db, days_old=365)
        cleanup_expired_payments(db, days_old=30)
        cleanup_expired_credits(db, days_old=365)
        
        # File system cleanup
        cleanup_old_logs(days_old=90)
        
        # Database optimization
        optimize_database(db)
        
        logger.info("Maintenance tasks completed successfully")
        
    except Exception as e:
        logger.error(f"Maintenance tasks failed: {str(e)}")
        raise
    finally:
        db.close()

def optimize_database(db: Session):
    """Run database optimization tasks"""
    try:
        # Analyze tables for query optimization
        db.execute("ANALYZE;")
        
        # Vacuum to reclaim space
        db.execute("VACUUM;")
        
        # Reindex for performance
        db.execute("REINDEX DATABASE kisaan_center;")
        
        logger.info("Database optimization completed")
        
    except Exception as e:
        logger.error(f"Database optimization failed: {str(e)}")

if __name__ == "__main__":
    run_maintenance_tasks()
```

---

## 📈 Metrics Collection

```python
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

class MetricsCollector:
    def get_system_metrics(self) -> Dict[str, Any]:
        """Collect system-level metrics"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": "running",
            "version": "1.0.0"
        }
    
    def get_database_metrics(self, db: Session) -> Dict[str, Any]:
        """Collect database metrics"""
        try:
            # Count active users
            active_users = db.query(
                User.role,
                func.count(User.id)
            ).filter(
                User.status == "ACTIVE"
            ).group_by(User.role).all()
            
            user_breakdown = {role: count for role, count in active_users}
            
            # Shop performance metrics
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            shop_performance = db.query(
                Shop.id,
                Shop.name,
                func.count(Transaction.id).label('transaction_count'),
                func.sum(Transaction.commission_amount).label('total_commission')
            ).join(
                Transaction, Shop.id == Transaction.shop_id
            ).filter(
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "COMPLETED"
            ).group_by(Shop.id, Shop.name).all()
            
            top_shops = [
                {
                    "shop_id": shop.id,
                    "shop_name": shop.name,
                    "transaction_count": shop.transaction_count,
                    "total_commission": float(shop.total_commission or 0)
                }
                for shop in shop_performance
            ]
            
            return {
                "active_users_by_role": user_breakdown,
                "top_performing_shops": sorted(
                    top_shops, 
                    key=lambda x: x["total_commission"], 
                    reverse=True
                )[:10]
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_business_metrics(self, db: Session) -> Dict[str, Any]:
        """Collect business metrics"""
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            # Revenue calculations
            recent_transactions = db.query(Transaction).filter(
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "COMPLETED"
            ).all()
            
            total_revenue = sum(t.total_amount for t in recent_transactions)
            total_commission = sum(t.commission_amount for t in recent_transactions)
            
            # Active users by role
            active_users = db.query(
                User.role,
                func.count(User.id)
            ).filter(
                User.status == "ACTIVE"
            ).group_by(User.role).all()
            
            user_breakdown = {role: count for role, count in active_users}
            
            # Shop performance metrics
            shop_performance = db.query(
                Shop.id,
                Shop.name,
                func.count(Transaction.id).label('transaction_count'),
                func.sum(Transaction.commission_amount).label('total_commission')
            ).join(
                Transaction, Shop.id == Transaction.shop_id
            ).filter(
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "COMPLETED"
            ).group_by(Shop.id, Shop.name).all()
            
            top_shops = [
                {
                    "shop_id": shop.id,
                    "shop_name": shop.name,
                    "transaction_count": shop.transaction_count,
                    "total_commission": float(shop.total_commission or 0)
                }
                for shop in shop_performance
            ]
            
            return {
                "revenue_30_days": {
                    "total_revenue": float(total_revenue),
                    "total_commission": float(total_commission),
                    "transaction_count": len(recent_transactions)
                },
                "active_users_by_role": user_breakdown,
                "top_performing_shops": sorted(
                    top_shops, 
                    key=lambda x: x["total_commission"], 
                    reverse=True
                )[:10]
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Collect all metrics"""
        db = SessionLocal()
        try:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "system": self.get_system_metrics(),
                "database": self.get_database_metrics(db),
                "business": self.get_business_metrics(db)
            }
        finally:
            db.close()

# Global metrics collector instance
metrics_collector = MetricsCollector()
```

---

## 🔐 Security Enhancements

### Content Security Policy Headers
```python
from fastapi import FastAPI, Response

app = FastAPI()

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

### SQL Injection Protection Utilities
```python
import logging
import re
from typing import List

logger = logging.getLogger(__name__)

class SQLInjectionProtection:
    """SQL Injection protection utilities"""
    
    SUSPICIOUS_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
        r"(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)",
        r"(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)"
    ]
    
    @classmethod
    def validate_input(cls, input_string: str) -> bool:
        """Check if input contains SQL injection patterns"""
        if not input_string:
            return True
        
        input_upper = input_string.upper()
        
        for pattern in cls.SUSPICIOUS_PATTERNS:
            if re.search(pattern, input_upper, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {input_string[:100]}")
                return False
        
        return True
    
    @classmethod
    def sanitize_input(cls, input_string: str) -> str:
        """Sanitize input by removing dangerous characters"""
        if not input_string:
            return ""
        
        # Remove dangerous characters
        dangerous_chars = ["'", '"', ";", "--", "/*", "*/", "xp_", "sp_"]
        sanitized = input_string
        
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, "")
        
        return sanitized.strip()
```

### Cross-Site Scripting Protection Utilities
```python
import re
from typing import List

class XSSProtection:
    """Cross-Site Scripting protection utilities"""
    
    DANGEROUS_TAGS = [
        'script', 'iframe', 'object', 'embed', 'form', 'input',
        'button', 'select', 'textarea', 'link', 'meta', 'style'
    ]
    
    DANGEROUS_ATTRIBUTES = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus',
        'onblur', 'onchange', 'onsubmit', 'javascript:', 'vbscript:'
    ]
    
    @classmethod
    def sanitize_html(cls, html_string: str) -> str:
        """Sanitize HTML content to prevent XSS"""
        if not html_string:
            return ""
        
        # Remove script tags and content
        html_string = re.sub(r'<script[^>]*>.*?</script>', '', html_string, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove dangerous tags
        for tag in cls.DANGEROUS_TAGS:
            pattern = f'<{tag}[^>]*>.*?</{tag}>'
            html_string = re.sub(pattern, '', html_string, flags=re.IGNORECASE | re.DOTALL)
            
            # Remove self-closing tags
            pattern = f'<{tag}[^>]*/?>'
            html_string = re.sub(pattern, '', html_string, flags=re.IGNORECASE)
        
        # Remove dangerous attributes
        for attr in cls.DANGEROUS_ATTRIBUTES:
            pattern = f'{attr}\\s*=\\s*["'][^"']*["']'
            html_string = re.sub(pattern, '', html_string, flags=re.IGNORECASE)
        
        return html_string
    
    @classmethod
    def escape_html(cls, text: str) -> str:
        """Escape HTML special characters"""
        if not text:
            return ""
        
        escape_chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        }
        
        for char, escape in escape_chars.items():
            text = text.replace(char, escape)
        
        return text
```