# KisaanCenter API Contract Analysis

## 🚨 CRITICAL FINDINGS - DATA MODEL MISMATCHES

### **User Entity Issues**

#### **Database Model vs API Response vs Frontend Types**
| Field | Database Model | API Response | Frontend Type | Status |
|-------|---------------|--------------|---------------|--------|
| `status` | ❌ Missing | ✅ Present (hardcoded 'active') | ✅ Required | **MISMATCH** |
| `cumulative_value` | ❌ Missing | ✅ Present (hardcoded 0) | ✅ Required | **MISMATCH** |
| `balance` | ✅ DECIMAL(12,2) | ✅ number | ✅ number | ✅ MATCH |
| `custom_commission_rate` | ✅ DECIMAL(6,2) | ✅ number | ❌ Missing as commission_rate | **MISMATCH** |

**Problem**: UserMapper adds fake fields (`status`, `cumulative_value`) that don't exist in database

### **Transaction Entity Issues**

#### **Database Model vs API Response vs Frontend Types**
| Field | Database Model | API Response | Frontend Type | Status |
|-------|---------------|--------------|---------------|--------|
| `total_amount` | ✅ DECIMAL(12,2) | ✅ Present | ❌ `total_sale_value` | **NAMING MISMATCH** |
| `commission_amount` | ✅ DECIMAL(12,2) | ✅ Present | ❌ `shop_commission` | **NAMING MISMATCH** |
| `status` | ✅ STRING(20) | ✅ Present | ✅ union type | ✅ MATCH |
| `product_id` | ✅ BIGINT | ✅ Present | ❌ Missing | **FRONTEND MISSING** |

**Problem**: Frontend uses different field names than backend/database

### **Payment Entity Status**
✅ **ALIGNED** - Database, API, and Frontend all match for Payment structure

### **Shop Entity Status**  
✅ **MOSTLY ALIGNED** - Minor differences in optional fields

---

## 📊 API ENDPOINTS ANALYSIS

### ✅ Working Endpoints Tested
- `POST /api/auth/login` - JWT authentication working
- `GET /api/users` - Pagination working, but field mismatches
- `GET /api/transactions` - Relationships working with payments
- `GET /api/shops` - Basic shop data working
- `GET /api/categories` - Category data working
- `GET /api/products` - Product catalog working
- `GET /api/payments` - Empty but no errors

### 🔍 **Field-by-Field API Response Analysis**

#### Users API Response:
```json
{
  "id": "4",                    // ⚠️  String in API, number in frontend
  "username": "buyer1_2_580",   // ✅ Correct
  "role": "buyer",              // ✅ Correct
  "shop_id": "1",               // ⚠️  String in API, number in frontend  
  "balance": 39840,             // ✅ Correct
  "status": "active",           // ❌ FAKE - Not in database
  "cumulative_value": 0         // ❌ FAKE - Not in database
}
```

#### Transactions API Response:
```json
{
  "id": 7,                      // ✅ Correct
  "total_amount": 500,          // ❌ Frontend expects "total_sale_value"
  "commission_amount": 25,      // ❌ Frontend expects "shop_commission"
  "farmer_earning": 475,        // ✅ Correct
  "payments": []                // ✅ Correct relationship
}
```

---

## 🎯 **PRIORITY FIXES NEEDED**

### **HIGH PRIORITY (Breaking Issues)**
1. **Remove fake fields** from UserMapper (`status`, `cumulative_value`)
2. **Add missing database columns** for User (`status`, `cumulative_value`) OR update frontend
3. **Fix ID type consistency** - database returns strings, frontend expects numbers
4. **Align transaction field names** between backend/frontend

### **MEDIUM PRIORITY (Inconsistencies)**
1. **Standardize decimal handling** across all monetary fields
2. **Add missing product_id** to frontend Transaction type
3. **Verify commission_rate vs custom_commission_rate** naming

### **LOW PRIORITY (Enhancements)**
1. Add proper relationship loading for shop data in user responses
2. Consider adding computed fields legitimately to database

---

## 🔧 **RECOMMENDED ACTIONS**

### **Option A: Update Database (Recommended)**
- Add `status` ENUM('active', 'inactive') to users table
- Add `cumulative_value` DECIMAL(12,2) to users table
- Update migration scripts

### **Option B: Update Frontend**
- Remove `status` and `cumulative_value` from User interface
- Handle these as optional fields

### **Option C: Fix Mappers (Quickest)**
- Remove hardcoded fake fields from userMapper
- Update frontend to handle missing fields gracefully

---

*Analysis Date: 2025-09-27*
*Status: In Progress - More endpoints to analyze*