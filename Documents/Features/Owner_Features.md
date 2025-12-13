
# Market Management System - Owner Features & User Journey

## 🏪 **Owner - Complete Feature Set & Use Cases**

Based on the comprehensive ERD and business logic, this document outlines all features available to Shop Owners, with practical examples and implementation details.

---

## What Owner Has Access To

### Complete Shop Management
- **Full control** over their assigned shop(s)
- **All data visibility** within shop scope
- **Financial oversight** of all transactions and payments
- **User management** for employees, farmers, and buyers
- **System configuration** for shop-specific settings

### Database Entities Accessible:
- `USER` (all roles within shop)
- `PRODUCT` (shop products)
- `FARMER_STOCK` (all deliveries)
- `TRANSACTION` & `TRANSACTION_ITEM` (all sales)
- `CREDIT` & `CREDIT_DETAIL` (buyer credits)
- `PAYMENT` & `FARMER_PAYMENT` (all payments)
- `COMMISSION_RULE` (commission configuration)
- `EXPENSE` (shop expenses)
- `STOCK_ADJUSTMENT` (inventory adjustments)
- `AUDIT_LOG` (complete audit trail)

---

## Core Owner Capabilities

### 1. User Management
#### **What Owner Can Do:**
- Create/update/suspend employees, farmers, and buyers
- Assign roles and permissions to employees
- Set credit limits for buyers
- Monitor user activity and performance
- Handle user disputes and account issues

#### **Practical Examples:**
```
Example 1 - Add New Farmer:
- Create USER record with role='farmer'
- Set contact information and initial setup
- Farmer can start delivering products immediately

Example 2 - Employee Management:
- Create USER with role='employee'
- Assign specific permissions (cashier, stock manager, etc.)
- Monitor daily activities through audit logs

Example 3 - Buyer Credit Management:
- Set credit_limit = ₹50,000 for premium buyer
- Monitor outstanding amounts via CREDIT table
- Adjust limits based on payment history
```

#### **API Endpoints Used:**
- `POST /users` - Create new user
- `PUT /users/{id}` - Update user details
- `PATCH /users/{id}/status` - Suspend/activate
- `GET /owner/users` - List shop users

---

### 2. Product & Inventory Management

#### **What Owner Can Do:**
- Select which products to offer from master catalog
- Set pricing strategies and commission rules
- Monitor stock levels and farmer deliveries
- Handle stock adjustments and corrections
- Track product performance and pricing history

#### **Practical Examples:**
```
Example 1 - Product Selection:
- From CATEGORY table: flowers, vegetables, fruits
- Select specific products: 'rose', 'marigold', 'tomato'
- Create PRODUCT records for shop
- Set initial pricing and commission rules

Example 2 - Stock Management:
- Farmer delivers 100kg roses → FARMER_STOCK record
- Monitor daily sales reducing stock quantities
- Adjust stock for damaged/expired items via STOCK_ADJUSTMENT
- Track which farmer's products sell faster

Example 3 - Commission Configuration:
COMMISSION_RULE examples:
- Flat rate: 5% on all flower sales
- Slab rate: 3% (0-50kg), 5% (50-200kg), 7% (>200kg)
- Product-specific: Higher commission on premium flowers
```

#### **Database Operations:**
```sql
-- Check current stock levels
SELECT fs.farmer_user_id, p.name, fs.quantity 
FROM FARMER_STOCK fs 
JOIN PRODUCT p ON fs.product_id = p.id 
WHERE fs.shop_id = {owner_shop_id} AND fs.status = 'active';

-- Set commission rule
INSERT INTO COMMISSION_RULE (shop_id, product_id, rule_type, rate) 
VALUES (123, 456, 'flat', 5.00);
```

---

### 3. Transaction & Sales Management

#### **What Owner Can Do:**
- Monitor all sales transactions in real-time
- Process returns and exchanges
- Handle payment disputes
- Analyze sales patterns and trends
- Generate invoices and receipts

#### **Practical Examples:**
```
Example 1 - Daily Sales Overview:
- View all TRANSACTION records for current date
- See breakdown by farmer, product, buyer
- Monitor commission earnings per transaction
- Track payment status (cash vs credit)

Example 2 - Return Processing:
- Customer returns 5kg roses (transaction_id: 789)
- Create new TRANSACTION with parent_transaction_id = 789
- Restore FARMER_STOCK quantity
- Process refund via PAYMENT record

Example 3 - Credit Sales Monitoring:
- Track CREDIT records for all buyers
- See detailed breakdown via CREDIT_DETAIL
- Monitor which buyers are approaching credit limits
- Generate payment reminder notifications
```

#### **Key Metrics Available:**
- Daily/monthly sales volume
- Revenue per farmer/product
- Commission earnings
- Payment collection rates
- Return/exchange percentages

---

### 4. Financial Management

#### **What Owner Can Do:**
- Process farmer payments (advances & settlements)
- Track all shop expenses
- Monitor buyer credit and collections
- Generate financial reports
- Manage cash flow

#### **Practical Examples:**
```
Example 1 - Farmer Settlement:
Farmer A delivered roses worth ₹10,000
- Sale amount: ₹10,000
- Commission (5%): ₹500
- Previous advance: ₹2,000
- Settlement: ₹10,000 - ₹500 - ₹2,000 = ₹7,500

FARMER_PAYMENT record:
- payment_type: 'settlement'
- amount: ₹7,500
- Links to specific transaction

Example 2 - Expense Tracking:
Daily expenses via EXPENSE table:
- Employee wages: ₹1,500
- Shop rent: ₹500
- Electricity: ₹200
- Transport: ₹300
- Total: ₹2,500

Example 3 - Credit Collection:
Buyer B owes ₹15,000 across multiple farmers:
- ₹8,000 to Farmer A (flowers)
- ₹5,000 to Farmer C (vegetables)
- ₹2,000 to Farmer D (fruits)
Track via CREDIT_DETAIL table
```

---

### 5. Reporting & Analytics

#### **What Owner Can Do:**
- Generate comprehensive business reports
- Analyze profitability by product/farmer
- Track seasonal trends
- Monitor operational efficiency
- Export data for accounting

#### **Available Reports:**
```
1. Sales Reports:
   - Daily/monthly/yearly sales
   - Product-wise performance
   - Farmer-wise contribution
   - Payment method analysis

2. Financial Reports:
   - Profit & loss statements
   - Commission earnings
   - Expense summaries
   - Cash flow reports

3. Operational Reports:
   - Stock movement analysis
   - Return/exchange rates
   - User activity reports
   - Audit trail reports
```

---

### 6. System Administration

#### **What Owner Can Do:**
- Configure shop settings and preferences
- Manage commission rules and pricing
- Set up automated notifications
- Handle system integrations
- Backup and data management

#### **Configuration Options:**
```
Shop Settings:
- Operating hours and holidays
- Default payment terms
- Credit limit policies
- Commission structures
- Notification preferences

User Preferences:
- Dashboard layout
- Report formats
- Alert thresholds
- Language and currency settings
```

---

## Owner Daily Workflow Examples

### Morning Routine (8:00 AM - 10:00 AM)
```
1. Review overnight deliveries:
   GET /owner/stock?date=today&status=new
   
2. Check pending payments:
   GET /owner/credits?status=overdue
   
3. Review employee assignments:
   GET /owner/users?role=employee&status=active
   
4. Set daily priorities and goals
```

### Midday Operations (10:00 AM - 4:00 PM)
```
1. Monitor live sales:
   GET /owner/transactions?date=today&status=completed
   
2. Handle customer issues:
   GET /audit-logs?entity_type=TRANSACTION&date=today
   
3. Process farmer payment requests:
   GET /farmer-payments?status=pending
   
4. Manage stock adjustments:
   POST /stock/{id}/adjust (for damaged goods)
```

### Evening Review (4:00 PM - 6:00 PM)
```
1. Generate daily reports:
   GET /reports/sales?shop_id=123&date=today
   
2. Review financial summary:
   GET /reports/payments?date=today&type=summary
   
3. Plan next day operations:
   GET /owner/stock?status=active (available for tomorrow)
   
4. Handle pending approvals:
   GET /stock-adjustments?status=pending&amount>threshold
```

---

## Advanced Owner Features

### Business Intelligence
- Seasonal trend analysis
- Farmer performance rankings
- Product profitability analysis
- Customer segmentation
- Predictive analytics for demand

### Automation Capabilities
- Automatic commission calculations
- Scheduled payment reminders
- Stock reorder alerts
- Expense approval workflows
- Audit report generation

### Integration Features
- Accounting software integration
- Payment gateway connections
- SMS/email notification systems
- Barcode/QR code scanning
- Mobile app synchronization

---

## Security & Compliance

### Owner Responsibilities
- Ensure data accuracy and integrity
- Maintain audit trail compliance
- Handle sensitive financial information
- Manage user access permissions
- Regular system backups

### Compliance Features
- Complete transaction logging
- Financial record keeping
- Tax calculation and reporting
- User activity monitoring
- Data privacy protection

---

## Success Metrics for Owners

### Financial KPIs
- Daily/monthly revenue growth
- Commission earnings optimization
- Cost reduction achievements
- Payment collection rates
- Profit margin improvements

### Operational KPIs
- Transaction processing speed
- Stock turnover rates
- Customer satisfaction scores
- Employee productivity metrics
- System uptime and reliability

This comprehensive feature set ensures owners have complete control and visibility over their market operations while maintaining efficiency and compliance standards.

### Sales & Transaction Management

- Record sales, including multi-product transactions and discounts.
- Handle credit sales, partial payments, and payment reminders (CREDIT table).
- Link each sale to buyer and product; each transaction item is linked to the source farmer stock for traceability.
- Process returns/exchanges, update stock and payments.
- View transaction history, filter by date, product, buyer, or farmer.
- ERD: Supported via TRANSACTION, TRANSACTION_ITEM, PAYMENT, CREDIT.

### Payment & Commission Management

- Pay farmers (full or partial), track pending payments.
- View commission breakdowns per transaction, per product, and per farmer.
- Handle overpayments/underpayments, reconcile with audit logs.
- Set custom commission rates for special products or farmers (COMMISSION_RULE table).
- ERD: Supported via PAYMENT, TRANSACTION, AUDIT_LOG, COMMISSION_RULE.

### Expense & Financial Management
- Record shop expenses (wages, rent, utilities, supplies).
- Attach receipts or notes to expense entries.
- Generate profit/loss statements and cash flow reports.
- Set budget limits and receive alerts for overspending.
- ERD: Supported via EXPENSE.

### Reporting & Analytics
- Generate sales, payment, expense, and inventory reports.
- Visualize trends (e.g., best-selling flowers, peak sales times).
- Export data to Excel/CSV for further analysis.
- Schedule automated report delivery via email/SMS.
- ERD: Supported via all major entities.

### Plan & Feature Management
- View current plan and available features.
- Request plan upgrades or feature add-ons (e.g., bulk SMS, advanced analytics).
- Monitor usage limits (e.g., number of users, transactions, storage).
- ERD: Supported via PLAN, SHOP.

### Compliance & Audit
- Access audit logs for all actions (user changes, payments, stock updates).
- Generate compliance reports for regulatory checks.
- Respond to superadmin requests for investigation or data freeze.
- ERD: Supported via AUDIT_LOG.

### Multi-Shop & Multi-Region Management
- Manage multiple shops from a single dashboard.

- Transfer selected products, users, or funds between shops.
- Support for multi-currency and region-specific pricing for selected products.
- ERD: Supported via SHOP, PRODUCT, USER.

### Communication & Notifications
- Send messages or alerts to employees, farmers, or buyers.
- Receive system notifications for low stock, pending payments, disputes, or compliance issues.
- ERD: Can be supported via additional notification/message tables.

### Edge Cases & Advanced Scenarios
- Handle buyer defaults: restrict credit, flag risky buyers.
- Manage farmer disputes: review audit logs, adjust payments.
- Process bulk imports/exports for onboarding or migration.
- Shop transfer: update owner, migrate all related data.
- Regulatory freeze: suspend shop, restrict all actions, maintain audit trail.
- ERD: Supported via status fields, audit logs, and relationships.

---

Owner is responsible for day-to-day shop operations, user management, and business growth within KisaanCenter. All features above are supported or can be supported by the current ERD, with minor extensions for messaging/notifications if needed. This covers day-to-day, advanced, and edge-case scenarios for owners in KisaanCenter.
Owner is responsible for day-to-day shop operations, user management, and business growth within KisaanCenter.
