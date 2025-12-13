# Farmer Stock Management System - Backend Setup & Migration Guide

This document provides step-by-step instructions to set up, migrate, and validate the backend for the Farmer Stock Management System, based on the implementation strategy and code snippets from your improvement plan.

---

## 1. Environment Setup

### 1.1. Prepare Node Development Environment
Ensure Node and npm are installed. If using a local node version manager, activate the appropriate Node version.

```powershell
# Install Node dependencies for the backend service
npm --prefix kisaan-backend-node install
```

### 1.2. Install Dependencies
Install Node dependencies for the backend:
```powershell
npm --prefix kisaan-backend-node install
```

---

## 2. Database Migration

### 2.1. Navigate to Backend Directory
```powershell
cd backend
```

### 2.2. Run Alembic Migrations
Apply all migration scripts to sync your database schema:
```powershell
alembic upgrade head
```

---

## 3. Validation & Testing

### 3.1. Validate Database Connection
Run the backend's test or health scripts to ensure the schema and connections are correct. Example (may vary by project):
```powershell
npm --prefix kisaan-backend-node run test:connection
npm --prefix kisaan-backend-node run test:db-fix
```

### 3.2. Start Backend Server
Start the Node backend as described in the backend README. Example:
```powershell
npm --prefix kisaan-backend-node run dev
```

---

## 4. Advanced Database Features (Optional)

### 4.1. Apply Audit Triggers (PostgreSQL)
Run these SQL statements in your database (e.g., via pgAdmin or psql):
```sql
CREATE OR REPLACE FUNCTION farmer_stock_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, new_values, timestamp)
        VALUES(NEW.id, 'db_insert', row_to_json(NEW), NOW());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, old_values, new_values, timestamp)
        VALUES(NEW.id, 'db_update', row_to_json(OLD), row_to_json(NEW), NOW());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO farmer_stock_audit(farmer_stock_id, action_type, old_values, timestamp)
        VALUES(OLD.id, 'db_delete', row_to_json(OLD), NOW());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmer_stock_audit_insert_update
AFTER INSERT OR UPDATE ON farmer_stock
FOR EACH ROW EXECUTE FUNCTION farmer_stock_audit_trigger();

CREATE TRIGGER farmer_stock_audit_delete
AFTER DELETE ON farmer_stock
FOR EACH ROW EXECUTE FUNCTION farmer_stock_audit_trigger();
```

### 4.2. Partitioning Example (PostgreSQL)
```sql
CREATE TABLE farmer_stock_partitioned (
    LIKE farmer_stock INCLUDING ALL
) PARTITION BY RANGE (entry_date);

CREATE TABLE farmer_stock_y2023m08 PARTITION OF farmer_stock_partitioned
FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
```

---

## 5. Reference: Implementation Strategy

- Update SQLAlchemy models with missing fields and constraints
- Create migration scripts for schema changes
- Implement audit logging functionality
- Implement business rules as service layer functions
- Add validation logic for complex constraints
- Create helper functions for computed properties
- Add indexes for common query patterns
- Implement partitioning strategy (if needed)
- Add database-level constraints for data integrity

---

## 6. Troubleshooting
- If you encounter errors during migration, check Alembic logs and ensure your database is accessible.
- For advanced SQL features, ensure you have the necessary permissions in PostgreSQL.
- Validate your environment variables and database connection settings in `.env` or config files.

---

## 7. Additional Notes
- All code snippets and SQL statements are sourced from your improvement plan and ERD alignment document.
- For further customization, refer to the `improvemnts.md` file and backend source code.

---

**End of Guide**
