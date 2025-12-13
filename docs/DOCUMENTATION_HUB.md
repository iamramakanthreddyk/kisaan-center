> ✅ **Active Hub**: Central index. Deprecated files are bannered. See `DOCS_STATUS.md` for lifecycle states.

# 🌾 KisaanCenter Market Management System - Documentation Hub


## 📚 **Master Documentation Index**

Complete documentation suite for the three-party agricultural market management system.

---

## 🖥️ **Frontend Documentation Index**

All frontend documentation is now consolidated in `frontend/docs`:

1. **[Frontend README](../frontend/docs/README.md)** - Overview and architecture
2. **[Frontend Development & API Guide](../frontend/docs/FRONTEND_DEVELOPMENT_AND_API_GUIDE.md)** - Developer guide and API usage
3. **[Mobile UI Guide](../frontend/docs/MOBILE_UI_README.md)** - Mobile-first design and component documentation
 4. **[Frontend Architecture (Core Layers)](./FRONTEND_ARCHITECTURE.md)** - Current layering, patterns, helpers & endpoint consolidation strategy
 5. **[Transaction Flow & Derived Fields](./TRANSACTION_FLOW.md)** - End-to-end payload building, derived value logic, and related endpoints

---

---

## 🚀 **Quick Start Guide**

### For Developers
1. **[API Documentation](../API_DOCUMENTATION.md)** - Complete REST API reference
2. **[ERD](./Architecture/ERD.md)** - Entity relationship diagram and business model
3. **[Test Cases](../COMPREHENSIVE_TEST_CASES.md)** - Comprehensive testing guide

### For Business Users
1. **[Business Rules](./Architecture/Business_Rules.md)** - System logic and validation rules
2. **[User Features by Role](./Features/)** - Feature documentation per user type
3. **[Business Workflows](./Architecture/Business_Workflows.md)** - Process flows

---

## 🏗️ **Architecture Documentation**

### Core System Design
- **[ERD (Entity Relationship Diagram)](./Architecture/ERD.md)** ⭐
  - Complete database entity relationships
  - Three-party transaction completion model
  - Multi-tenant architecture design

- **[Database Schema](./Architecture/Database_Schema.md)** ⭐
  - SQL table definitions with constraints
  - Indexes and performance optimization
  - Data integrity rules

- **[Business Rules](./Architecture/Business_Rules.md)** ⭐
  - User role permissions and validation logic
  - Transaction completion business rules
  - Credit management and commission rules

- **[System Architecture](./Architecture/System_Architecture.md)** ⭐
  - Technology stack and deployment architecture
  - Scalability and performance considerations
  - Security and multi-tenancy implementation

### Workflow Documentation
- **[Business Workflows](./Architecture/Business_Workflows.md)** ⭐
  - Complete business process flows
  - User journey documentation
  - Transaction lifecycle workflows

- **[Transaction Completion Workflows](./Architecture/Transaction_Completion_Workflows.md)** ⭐
  - Three-party completion model details
  - Payment processing workflows
  - Commission confirmation processes

### Reference Materials
- **[ENUMs Reference](./Architecture/ENUMs.md)**
  - Standardized enum values and constants
  - Status codes and type definitions

---

## 👥 **User Features Documentation**

### Role-Based Feature Sets
- **[Owner Features](./Features/Owner_Features.md)** - Shop management and oversight
- **[Farmer Features](./Features/Farmer_Features.md)** - Stock delivery and payment tracking
- **[Buyer Features](./Features/Buyer_Features.md)** - Product purchase and credit management
- **[Employee Features](./Features/Employee_Features.md)** - Operational support tasks
- **[Superadmin Features](./Features/Superadmin_Features.md)** - System-wide administration

### Advanced Workflows
- **[Owner Enterprise Journey](./Features/Owner_Enterprise_Journey.md)** - Advanced enterprise features

---

## 🧪 **Testing Documentation**

### Comprehensive Test Suites
- **[Comprehensive Test Cases](../COMPREHENSIVE_TEST_CASES.md)** ⭐
  - 428+ individual test cases
  - Business logic and edge case validation
  - Performance and security testing

### Specialized Test Scenarios
- **[Partial Payments Test Scenario](./TestCases/PartialPayments_TestScenario.md)**
  - Complex payment workflow testing
  - Three-party completion validation

---

## 📊 **Development Resources**

### API Integration
- **[API Documentation](../API_DOCUMENTATION.md)** ⭐
  - Complete REST API reference
  - Request/response examples
  - Authentication and error handling

### Code Quality
- **[Test Cases](../COMPREHENSIVE_TEST_CASES.md)** - Testing methodology
- **ERD Visual Diagrams**:
  - **[ERD SVG](./Architecture/KisaanCenter_ERD.svg)** - Visual diagram
  - **[ERD Draw.io Source](./Architecture/KisaanCenter_ERD_drawio.xml)** - Editable source

---

## 🎯 **Business Presentations**

### Client Materials
- **[Client Presentation](./Presentations/Client_Presentation.md)** - Business overview
- **[Client Features Overview](./Presentations/Client_Features_Overview.txt)** - Feature breakdown
- **[PowerPoint Presentation](./Presentations/Market_Management_System.pptx)** - Slide deck

---

## 📋 **Documentation Maintenance**

### Document Status
| Document | Status | Last Updated | Priority |
|----------|--------|--------------|----------|
| API Documentation | ✅ Current | 2025-08-26 | Critical |
| ERD | ✅ Current | 2025-08-26 | Critical |
| Test Cases | ✅ Current | 2025-08-26 | Critical |
| Business Rules | ✅ Current | 2025-08-26 | High |
| User Features | ✅ Current | 2025-08-26 | High |
| System Architecture | ✅ Current | 2025-08-26 | Medium |

### Maintenance Schedule
- **Weekly**: Update API documentation for new endpoints
- **Monthly**: Review and update user features based on feedback
- **Quarterly**: Comprehensive review of business rules and workflows
- **As Needed**: ERD and schema updates for new features

---

## 🚀 **Development Workflow**

### Phase 1: Understanding the System
1. Read **[ERD](./Architecture/ERD.md)** to understand data relationships
2. Review **[API Documentation](../API_DOCUMENTATION.md)** for endpoint specifications
3. Study **[Business Rules](./Architecture/Business_Rules.md)** for validation logic

### Phase 2: Implementation
1. Use **[Database Schema](./Architecture/Database_Schema.md)** for database setup
2. Follow **[Business Workflows](./Architecture/Business_Workflows.md)** for process implementation
3. Reference **[User Features](./Features/)** for role-specific functionality

### Phase 3: Testing
1. Use **[Comprehensive Test Cases](../COMPREHENSIVE_TEST_CASES.md)** for test development
2. Follow **[Test Scenarios](./TestCases/)** for complex workflow validation
3. Implement business rule validation tests

### Phase 4: Deployment
1. Follow **[System Architecture](./Architecture/System_Architecture.md)** guidelines
2. Implement security and multi-tenancy requirements
3. Set up monitoring and performance optimization

---

## 📞 **Getting Help**

### For Questions About:
- **Database Design**: ERD.md → Database_Schema.md
- **API Integration**: API_DOCUMENTATION.md
- **Business Logic**: Business_Rules.md → Business_Workflows.md
- **User Features**: Features/ directory → specific role files
- **Testing**: COMPREHENSIVE_TEST_CASES.md
- **System Setup**: System_Architecture.md

### Documentation Standards
- All new features require feature documentation updates
- API changes require endpoint specification updates
- Database changes require schema and ERD updates
- Business logic changes require workflow documentation updates

---

## ✅ **Documentation Completeness**

### Core Architecture ✅
- ✅ Complete ERD with three-party transaction model
- ✅ Full database schema with SQL implementations
- ✅ Comprehensive business rules and validation logic
- ✅ Detailed API specification with real endpoints
- ✅ System architecture and deployment guidelines

### Business Documentation ✅
- ✅ Complete user feature documentation (5 roles)
- ✅ Business workflow documentation with examples
- ✅ Transaction completion model documentation

### Development Resources ✅
- ✅ Comprehensive test cases (428+ tests)
- ✅ API integration documentation
- ✅ Database setup and optimization guides

### Organization ✅
- ✅ Clear document hierarchy and navigation
- ✅ Cross-referenced documentation with clear links
- ✅ Role-based documentation access patterns

---

## 🎯 **Key System Features**

### Three-Party Transaction Completion Model
The unique selling point of this system - independent tracking of:
1. **Buyer Payments** - Amount paid by buyers
2. **Farmer Payments** - Settlements made to farmers
3. **Commission Confirmation** - Owner verification of commission

### Multi-Tenant Architecture
Complete data isolation between shops with superadmin oversight capability.

### Flexible Payment Systems
Support for full payments, partial payments, advance payments, and credit transactions.

### Real-Time Stock Management
Farmer stock delivery tracking with automatic inventory updates.

---

**This documentation suite provides complete coverage for development, testing, deployment, and business operations of the KisaanCenter Market Management System.** 🚀

**Priority Reading Order:**
1. ERD.md (understand the data model)
2. API_DOCUMENTATION.md (understand the endpoints)  
3. Business_Rules.md (understand the logic)
4. COMPREHENSIVE_TEST_CASES.md (understand testing requirements)
