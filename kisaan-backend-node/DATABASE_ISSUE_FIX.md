# 🔧 Database Clearing Issue - Root Cause & Fix

## 🚨 **Problem Identified**

Your database is being cleared on restart because:

1. **Same Database for Dev & Test**: Both `.env` and `.env.test` use the same database
2. **Test Scripts May Run**: Integration tests might be clearing data
3. **Potential Auto-Sync**: Sequelize might be synchronizing models

## ✅ **Immediate Fix**

### 1. **Separate Development Database**

Update your `.env` file to use a separate development database:

```env
# Development Database (SEPARATE from test)
DB_HOST=test.dev.ea.mpi-internal.com
DB_NAME=kisaan_dev  # Changed from 'postgres' to 'kisaan_dev'
DB_USER=postgres
DB_PASSWORD=xxxxx,xxxxx
DB_PORT=5432
DB_DIALECT=postgres
DB_SSL_MODE=require
```

### 2. **Keep Test Database Separate**

Your `.env.test` should use:
```env
DB_NAME=kisaan_test  # Different from development
```

### 3. **Verify No Auto-Sync**

Your `server.ts` correctly avoids auto-sync:
```typescript
// ✅ GOOD: No sequelize.sync() call
// Skip auto-sync to avoid schema conflicts
console.log('✅ Database models loaded (manual migration required).');
```

## 🛠️ **Implementation Steps**

### Step 1: Create Development Database
```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE kisaan_dev;
```

### Step 2: Run Migration on Dev Database
```bash
# Update .env with new DB name first
npm run migrate
```

### Step 3: Seed Development Data
```bash
# Run seeding scripts to populate initial data
ts-node scripts/seed-global-data.ts
```

### Step 4: Create Superadmin User
```bash
ts-node scripts/seed-superadmin.ts
```

## 🔍 **Verification**

After implementing the fix:

1. **Check Database Connection**:
   ```bash
   npm run dev
   # Should show: "Database connection established successfully"
   ```

2. **Verify Data Persistence**:
   - Create a user via API
   - Restart server
   - Check if user still exists

3. **Test Isolation**:
   ```bash
   npm run test:recommended
   # Should not affect development data
   ```

## 🚨 **Prevention Measures**

### 1. **Environment Isolation**
- ✅ Development: `kisaan_dev` database
- ✅ Testing: `kisaan_test` database  
- ✅ Production: `kisaan_prod` database

### 2. **No Auto-Sync**
- ✅ Use manual migrations only
- ✅ Never use `sequelize.sync({ force: true })`
- ✅ Never use `sequelize.sync({ alter: true })`

### 3. **Safe Testing**
- ✅ Tests use separate database
- ✅ Tests clean up after themselves
- ✅ Development data remains untouched

## 🎯 **Quick Fix Commands**

```bash
# 1. Update .env file (change DB_NAME to kisaan_dev)
# 2. Create and setup development database
npm run migrate

# 3. Seed initial data
ts-node scripts/seed-global-data.ts
ts-node scripts/seed-superadmin.ts

# 4. Start server
npm run dev

# 5. Verify data persists after restart
```

## ✅ **Expected Result**

After this fix:
- ✅ Development data persists across restarts
- ✅ Tests don't affect development data
- ✅ Clean separation of environments
- ✅ No more data loss issues

---
**Root Cause**: Using same database for development and testing
**Solution**: Separate databases + proper environment isolation