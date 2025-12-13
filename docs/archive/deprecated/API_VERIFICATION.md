# API Verification & Logic Review

## Core Transaction Logic (Based on CORE_IDEA.md)

### Business Requirements:
1. **Farmer brings produce** → Records transaction with farmer_id, product, quantity, price
2. **Buyer purchases** → Records buyer_id, payment amount
3. **Commission calculated** → Shop takes commission from total
4. **Status tracking** → paid/partial/credit/farmer_due based on payments
5. **Deficit tracking** → Outstanding amounts to be collected

## API Endpoints to Test

### 1. GET /api/transactions?shop_id=1&include_analytics=true
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "shop_id": 1,
      "farmer_id": "FARMER_001",
      "farmer_name": "John Farmer",
      "buyer_id": "BUYER_001", 
      "buyer_name": "Jane Buyer",
      "product_id": 1,
      "product_name": "Roses",
      "quantity": 10,
      "price": 15.00,
      "total": 150.00,
      "commission_rate": 10.00,
      "commission_amount": 15.00,
      "farmer_paid": 135.00,
      "buyer_paid": 150.00,
      "deficit": 0.00,
      "status": "paid",
      "transaction_date": "2025-01-07T10:00:00.000Z"
    }
  ],
  "analytics": {
    "total_transactions": 6,
    "total_sales": 1150.00,
    "total_commission": 115.00,
    "total_deficit": 0.00,
    "status_summary": {
      "paid": 1,
      "pending": 5
    },
    "income_by_status": {
      "paid": 150.00,
      "pending": 1000.00
    }
  }
}
```

### 2. POST /api/transactions
**Test Payload:**
```json
{
  "shop_id": 1,
  "farmer_id": "FARMER_001",
  "buyer_id": "BUYER_001",
  "product_id": 1,
  "quantity": 5,
  "price": 20.00,
  "buyer_paid": 100.00,
  "farmer_paid": 90.00
}
```

**Expected Logic:**
- total = quantity × price = 100.00
- commission_amount = total × 10% = 10.00
- deficit = total - buyer_paid = 0.00
- status = "paid" (buyer paid full, farmer paid correct amount)

### 3. GET /api/users (for farmers/buyers)
**Expected:** List of users with roles

### 4. GET /api/products?shop_id=1
**Expected:** Products filtered by shop's category

### 5. GET /api/shops?owner_id=OWNER_001
**Expected:** Shop details with category

## Status Logic Verification

### Status Calculation Rules:
1. **paid**: buyer_paid = total AND farmer_paid = (total - commission)
2. **credit**: buyer_paid = 0
3. **partial**: 0 < buyer_paid < total
4. **farmer_due**: buyer_paid = total BUT farmer_paid < (total - commission)
5. **pending**: Default status

## Test Cases to Verify:

### Case 1: Full Payment
- total: 100, buyer_paid: 100, farmer_paid: 90, commission: 10
- Expected status: "paid"

### Case 2: Credit Sale
- total: 100, buyer_paid: 0, farmer_paid: 0, commission: 10
- Expected status: "credit"

### Case 3: Partial Payment
- total: 100, buyer_paid: 50, farmer_paid: 0, commission: 10
- Expected status: "partial"

### Case 4: Farmer Due
- total: 100, buyer_paid: 100, farmer_paid: 50, commission: 10
- Expected status: "farmer_due" (farmer should get 90 but only got 50)

## Frontend Integration Points:

1. **Transaction List**: Shows farmer_name, buyer_name, product_name (not IDs)
2. **Analytics**: Real-time calculations for owner dashboard
3. **Search**: Works on names, not IDs
4. **Filters**: By status, date range, buyer/farmer

## Database Schema Verification:

Required fields in kisaan_transactions:
- ✅ farmer_id (VARCHAR)
- ✅ buyer_id (VARCHAR) 
- ✅ product_id (INTEGER)
- ✅ commission_rate, commission_amount
- ✅ farmer_paid, buyer_paid, deficit
- ✅ status ENUM with farmer_due