# ⚠️ DEPRECATED - API Specification

**This document is outdated and has been replaced.**

**Please refer to the current API documentation:**
- **[Current API Documentation](../../API_DOCUMENTATION.md)** - Complete, up-to-date API reference

---

## What Changed?

### Old vs New Structure
- **Old**: Theoretical endpoints that don't match implementation
- **New**: Actual endpoints from the codebase with real examples

### Key Updates
1. **Removed fictional authentication endpoints** (not implemented)
2. **Added actual three-party transaction model** endpoints
3. **Updated to match real FastAPI implementation**
4. **Added proper business rule documentation**
5. **Included actual request/response examples**

### Migration Guide
If you were using this old specification:

1. **User Management**: Endpoints remain similar, but response format updated
2. **Transactions**: Major changes with three-party completion model
3. **Payments**: New structure supporting partial payments
4. **Credits**: Enhanced credit management with detailed tracking

---

## 🚀 Use the New Documentation

**Current API Documentation**: [../../API_DOCUMENTATION.md](../../API_DOCUMENTATION.md)

The new documentation includes:
- ✅ Real endpoints from the codebase
- ✅ Three-party transaction completion model
- ✅ Actual request/response examples
- ✅ Business rules aligned with ERD
- ✅ Comprehensive error handling
- ✅ Proper filtering and pagination

---

**This file will be removed in the next cleanup cycle.**
PATCH  /users/{id}/status       # Update user status
```

**Example - Create User:**
```json
POST /users
{
  "username": "farmer_john",
  "password": "secure_password",
  "role": "farmer",
  "shop_id": 123,
  "contact": "+91-9876543210",
  "credit_limit": 10000.00
}
```

---

## Shop Management APIs

### Shop Operations
```http
GET    /shops                   # List shops
POST   /shops                   # Create shop
GET    /shops/{id}             # Get shop details
PUT    /shops/{id}             # Update shop
DELETE /shops/{id}             # Delete shop

GET    /shops/{id}/users       # Get shop users
GET    /shops/{id}/products    # Get shop products
GET    /shops/{id}/stats       # Get shop statistics
```

---

## Product & Inventory APIs

### Product Management
```http
GET    /products                # List products
POST   /products                # Create product
GET    /products/{id}          # Get product details
PUT    /products/{id}          # Update product
DELETE /products/{id}          # Delete product

GET    /categories             # List categories
POST   /categories             # Create category
```

### Stock Management
```http
GET    /shops/{shop_id}/stock            # Get available stock
POST   /shops/{shop_id}/stock            # Add farmer stock
PUT    /stock/{id}                       # Update stock
DELETE /stock/{id}                       # Delete stock

POST   /stock/{id}/adjust               # Stock adjustment
GET    /stock/{id}/history              # Stock history
```

**Example - Add Farmer Stock:**
```json
POST /shops/123/stock
{
  "farmer_user_id": 456,
  "product_id": 789,
  "quantity": 50.5,
  "delivery_date": "2025-08-25"
}
```

---

## Transaction APIs

### Transaction Management
```http
GET    /transactions                    # List transactions
POST   /transactions                    # Create transaction
GET    /transactions/{id}              # Get transaction details
PUT    /transactions/{id}              # Update transaction
DELETE /transactions/{id}              # Cancel transaction

GET    /transactions/{id}/items        # Get transaction items
POST   /transactions/{id}/items        # Add transaction item
PUT    /transaction-items/{id}         # Update item
DELETE /transaction-items/{id}         # Remove item
```

**Example - Create Transaction:**
```json
POST /transactions
{
  "shop_id": 123,
  "buyer_user_id": 789,
  "type": "sale",
  "items": [
    {
      "product_id": 456,
      "farmer_stock_id": 111,
      "quantity": 10.5,
      "price": 150.00
    }
  ],
  "payment_type": "credit"
}
```

### Return & Exchange
```http
POST   /transactions/{id}/return       # Process return
POST   /transactions/{id}/exchange     # Process exchange
GET    /transactions/{id}/returns      # Get return history
```

---

## Payment & Credit APIs

### Payment Processing
```http
GET    /payments                       # List payments
POST   /payments                       # Create payment
GET    /payments/{id}                 # Get payment details
PUT    /payments/{id}                 # Update payment status

POST   /payments/process              # Process payment
POST   /payments/refund               # Process refund
```

**Example - Process Payment:**
```json
POST /payments/process
{
  "credit_id": 123,
  "amount": 5000.00,
  "payment_method_id": 1,
  "reference_number": "UPI123456789"
}
```

### Credit Management
```http
GET    /credits                       # List credits
GET    /credits/{id}                 # Get credit details
GET    /credits/{id}/details         # Get credit breakdown
PUT    /credits/{id}/status          # Update credit status

GET    /buyers/{id}/ledger           # Buyer ledger
GET    /buyers/{id}/outstanding      # Outstanding amounts
```

### Farmer Payments
```http
GET    /farmer-payments               # List farmer payments
POST   /farmer-payments               # Create farmer payment
GET    /farmer-payments/{id}         # Get payment details

POST   /farmers/{id}/advance         # Pay advance
POST   /farmers/{id}/settlement      # Final settlement
GET    /farmers/{id}/ledger          # Farmer ledger
```

---

## Commission & Financial APIs

### Commission Management
```http
GET    /commission-rules              # List commission rules
POST   /commission-rules              # Create commission rule
PUT    /commission-rules/{id}         # Update rule
DELETE /commission-rules/{id}         # Delete rule

GET    /transactions/{id}/commission  # Calculate commission
POST   /commission/calculate          # Batch commission calculation
```

### Expense Management
```http
GET    /expenses                      # List expenses
POST   /expenses                      # Create expense
GET    /expenses/{id}                # Get expense details
PUT    /expenses/{id}                # Update expense
DELETE /expenses/{id}                # Delete expense

GET    /expense-categories           # List expense categories
GET    /expenses/summary             # Expense summary
```

---

## Reporting APIs

### Business Reports
```http
GET    /reports/sales                 # Sales reports
GET    /reports/stock                 # Stock reports
GET    /reports/payments              # Payment reports
GET    /reports/commission            # Commission reports
GET    /reports/expenses              # Expense reports

POST   /reports/custom                # Custom reports
GET    /reports/{id}/export           # Export report
```

**Example - Sales Report:**
```http
GET /reports/sales?shop_id=123&date_from=2025-08-01&date_to=2025-08-31&format=json
```

### Analytics
```http
GET    /analytics/dashboard           # Dashboard metrics
GET    /analytics/trends              # Trend analysis
GET    /analytics/performance         # Performance metrics
```

---

## User-Specific API Endpoints

### Owner APIs
```http
GET    /owner/dashboard               # Owner dashboard
GET    /owner/shops                  # Managed shops
GET    /owner/users                  # Shop users
GET    /owner/transactions           # All transactions
GET    /owner/reports                # Financial reports
POST   /owner/settings               # Update settings
```

### Farmer APIs
```http
GET    /farmer/dashboard             # Farmer dashboard
GET    /farmer/stock                 # My deliveries
GET    /farmer/sales                 # My sales
GET    /farmer/payments              # My payments
GET    /farmer/ledger                # Payment history
POST   /farmer/payment-request       # Request payment
```

### Buyer APIs
```http
GET    /buyer/dashboard              # Buyer dashboard
GET    /buyer/products               # Available products
POST   /buyer/purchase               # Make purchase
GET    /buyer/transactions           # My purchases
GET    /buyer/credits                # Outstanding credits
GET    /buyer/ledger                 # Payment history
```

### Employee APIs
```http
GET    /employee/dashboard           # Employee dashboard
POST   /employee/transaction         # Process sale
GET    /employee/stock               # Check stock
POST   /employee/stock-adjust        # Adjust stock
GET    /employee/tasks               # Assigned tasks
```

---

## Advanced Features APIs

### Audit & Logging
```http
GET    /audit-logs                   # List audit logs
GET    /audit-logs/{entity_type}/{entity_id}  # Entity audit trail
POST   /audit-logs/search            # Search audit logs
```

### Bulk Operations
```http
POST   /bulk/transactions            # Bulk transaction import
POST   /bulk/stock                   # Bulk stock update
POST   /bulk/payments                # Bulk payment processing
GET    /bulk/status/{job_id}         # Check bulk job status
```

### Notifications
```http
GET    /notifications                # List notifications
POST   /notifications                # Send notification
PUT    /notifications/{id}/read      # Mark as read
DELETE /notifications/{id}           # Delete notification
```

---

## Error Handling

### HTTP Status Codes
```
200 - OK
201 - Created
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
409 - Conflict
422 - Validation Error
500 - Internal Server Error
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "credit_limit",
      "reason": "Must be positive number"
    }
  },
  "timestamp": "2025-08-25T10:30:00Z"
}
```

---

## Rate Limiting & Security

### Rate Limits
```
Authentication: 10 requests/minute
General APIs: 100 requests/minute
Bulk Operations: 5 requests/minute
Reports: 20 requests/minute
```

### Security Headers
```http
X-API-Key: {api_key}
X-Request-ID: {unique_request_id}
X-Shop-ID: {shop_id}  # For shop-specific operations
```

### Pagination
```http
GET /transactions?page=1&limit=50&sort=date&order=desc

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

This API specification provides complete coverage for all user types and business operations while maintaining RESTful principles and security best practices.
