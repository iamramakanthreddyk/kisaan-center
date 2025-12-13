# Market Management System - Buyer Features & User Journey

## 🛒 **Buyer - Complete Feature Set & Use Cases**

Based on the comprehensive ERD and business logic, this document outlines all features available to Buyers, with practical examples and implementation details.

---

## What Buyer Has Access To

### Personal Transaction Scope
- **Own purchase history** and transaction records
- **Outstanding credit** details with farmer-wise breakdown
- **Payment history** and due dates
- **Available products** and current pricing
- **Personal profile** and credit limit information

### Database Entities Accessible:
- `USER` (own record only)
- `TRANSACTION` & `TRANSACTION_ITEM` (own purchases)
- `CREDIT` & `CREDIT_DETAIL` (own credit records)
- `PAYMENT` (own payment records)
- `PRODUCT` (available products - read only)
- `FARMER_STOCK` (available stock - read only)
- `AUDIT_LOG` (own transaction history)

---

## Core Buyer Capabilities

### 1. Product Browsing & Purchase

#### **What Buyer Can Do:**
- Browse available products and current pricing
- Check real-time stock availability
- Compare prices across different farmers
- Make immediate cash purchases
- Request credit purchases (within limit)
- View product quality and freshness details

#### **Practical Examples:**
```
Example 1 - Product Browsing:
Visit shop dashboard shows:
- Roses: 45kg available, ₹120/kg (Farmer A), ₹115/kg (Farmer B)
- Marigolds: 30kg available, ₹80/kg (Farmer C)
- Jasmine: 20kg available, ₹200/kg (Farmer D)
Real-time stock levels updated as others purchase

Example 2 - Cash Purchase:
Customer wants 10kg roses:
1. Select product and quantity
2. Choose farmer (based on price/quality preference)
3. Confirm purchase: ₹1,200 (10kg × ₹120)
4. Pay immediately via cash/UPI
5. Receive digital receipt
6. TRANSACTION record created with payment_status='completed'

Example 3 - Credit Purchase:
Regular buyer with ₹50,000 credit limit:
- Current outstanding: ₹15,000
- New purchase: ₹8,000 (within available credit)
- System checks: ₹15,000 + ₹8,000 < ₹50,000 ✓
- CREDIT and CREDIT_DETAIL records created
- Payment can be made later
```

#### **API Endpoints Used:**
- `GET /buyer/products` - Browse available products
- `POST /buyer/purchase` - Make purchase
- `GET /buyer/transactions` - Purchase history

---

### 2. Credit Management & Ledger

#### **What Buyer Can Do:**
- Monitor total outstanding credit amount
- View detailed breakdown by farmer and product
- Track payment due dates and aging
- Make partial or full credit payments
- Request credit limit increases
- Export credit statements

#### **Practical Examples:**
```
Example 1 - Credit Breakdown Visibility:
Total Outstanding: ₹25,000 breakdown:
- Farmer A (roses): ₹12,000 (5 transactions)
- Farmer B (marigolds): ₹8,000 (3 transactions)  
- Farmer C (jasmine): ₹5,000 (2 transactions)

CREDIT_DETAIL table provides:
- Which farmer supplied what product
- Quantity and price per transaction
- Purchase dates for aging analysis
- Individual line item tracking

Example 2 - Payment Planning:
Credit aging analysis:
- 0-15 days: ₹8,000 (current)
- 16-30 days: ₹12,000 (due soon)
- 31-45 days: ₹5,000 (overdue)
Priority: Pay overdue amounts first

Example 3 - Partial Payment Application:
Outstanding: ₹25,000 across multiple farmers
Payment: ₹10,000 made today
System applies FIFO (oldest debts first):
- ₹5,000 → Farmer C (oldest, fully clears)
- ₹5,000 → Farmer B (partial payment)
Updated outstanding: ₹15,000
```

#### **Credit Ledger Features:**
```sql
-- Buyer's complete ledger view
SELECT cd.farmer_user_id, p.name as product, 
       cd.quantity, cd.price, cd.date,
       (cd.quantity * cd.price) as amount
FROM CREDIT_DETAIL cd
JOIN PRODUCT p ON cd.product_id = p.id
WHERE cd.buyer_user_id = {buyer_id}
ORDER BY cd.date DESC;

-- Outstanding summary by farmer
SELECT cd.farmer_user_id, 
       SUM(cd.quantity * cd.price) as outstanding_amount
FROM CREDIT_DETAIL cd
JOIN CREDIT c ON cd.credit_id = c.id
WHERE c.buyer_user_id = {buyer_id} 
AND c.status IN ('pending', 'partial')
GROUP BY cd.farmer_user_id;
```

---

### 3. Payment Processing

#### **What Buyer Can Do:**
- Make payments against outstanding credits
- Choose payment methods (cash, UPI, card, etc.)
- Schedule future payments
- Get payment confirmations and receipts
- Track payment history with details
- Handle payment disputes

#### **Practical Examples:**
```
Example 1 - Full Credit Settlement:
Outstanding to Farmer A: ₹12,000
Make payment:
- Amount: ₹12,000
- Method: UPI
- Reference: UPI123456789
- PAYMENT record created linking to CREDIT
- CREDIT.status updated to 'cleared'
- Farmer A gets settlement notification

Example 2 - Partial Payment Strategy:
Total outstanding: ₹30,000
Available funds: ₹15,000
Strategic payment:
- Pay ₹8,000 to Farmer A (high priority supplier)
- Pay ₹7,000 to Farmer B (maintain relationship)
- Farmer C: ₹15,000 remains (negotiate extended terms)

Example 3 - Payment Method Flexibility:
Multiple payment options:
- Cash: Direct payment at shop
- UPI: Instant digital transfer
- Card: Credit/debit card processing
- Bank transfer: For large amounts
- Cheque: Traditional payment method
All methods tracked in PAYMENT_METHOD table
```

---

### 4. Transaction History & Analytics

#### **What Buyer Can Do:**
- View complete purchase history with filters
- Analyze spending patterns by product/farmer
- Track seasonal buying trends
- Export data for personal accounting
- Compare prices over time
- Generate purchase reports

#### **Practical Examples:**
```
Example 1 - Purchase History Analysis:
Monthly spending breakdown:
- January: ₹45,000 (festival season - high jasmine purchase)
- February: ₹28,000 (normal operations)
- March: ₹52,000 (wedding season peak)
- April: ₹35,000 (spring festivals)
Insight: Plan cash flow for seasonal peaks

Example 2 - Supplier Performance Tracking:
Compare farmers over 3 months:
- Farmer A: Consistent quality, competitive pricing
- Farmer B: Premium products, higher prices
- Farmer C: Good value, occasional quality issues
Decision: Primary orders to A, premium needs to B

Example 3 - Price Trend Monitoring:
Rose prices over 6 months:
- Jan: ₹120/kg (normal)
- Feb: ₹100/kg (low season)
- Mar: ₹150/kg (wedding season)
- Apr: ₹110/kg (post-season)
- May: ₹95/kg (summer low)
- Jun: ₹105/kg (pre-monsoon)
Insight: Time purchases for cost optimization
```

---

### 5. Return & Exchange Management

#### **What Buyer Can Do:**
- Initiate return requests for quality issues
- Process exchanges for different products
- Track return/exchange status
- Get refunds or credit adjustments
- Document quality issues for future reference
- Maintain relationships despite issues

#### **Practical Examples:**
```
Example 1 - Quality-Based Return:
Purchased 20kg roses, discovered 5kg damaged:
1. Report issue immediately at shop
2. Quality verification by owner/employee
3. Return transaction created (parent_transaction_id linked)
4. Options: Cash refund or credit adjustment
5. FARMER_STOCK quantity restored (5kg)
6. Farmer notified for quality improvement

Example 2 - Product Exchange:
Bought marigolds, need roses instead:
- Original: 15kg marigolds at ₹80/kg = ₹1,200
- Exchange: 10kg roses at ₹120/kg = ₹1,200
- No additional payment needed (equal value)
- Exchange transaction created
- Stock adjustments for both products

Example 3 - Partial Return with Credit:
Large purchase with mixed quality:
- Total: 50kg mixed flowers = ₹6,000
- Return: 8kg poor quality = ₹960
- Keep: 42kg good quality = ₹5,040
- Credit adjustment: ₹960 applied to outstanding
- Future purchase planning: Order from different farmer
```

---

## Buyer Types & Special Features

### Regular Buyers
- **Established credit limits** based on payment history
- **Preferred pricing** or early access to premium stock
- **Loyalty rewards** and seasonal discounts
- **Priority support** for issues and disputes
- **Advanced credit terms** (30-45 days payment)

### Premium/Wholesale Buyers
- **Higher credit limits** (₹1,00,000+)
- **Volume-based pricing** and commission structures
- **Dedicated farmer relationships** for consistent supply
- **Custom payment terms** and financing options
- **Priority stock allocation** during peak seasons

### Guest/Walk-in Buyers
- **Cash-only transactions** (no credit facility)
- **Temporary user accounts** for single transactions
- **Basic receipt and documentation**
- **Optional registration** to become regular buyers
- **No transaction history** carried forward if not registered

---

## Buyer Daily Workflow Examples

### Morning Planning (7:00 AM - 9:00 AM)
```
1. Check available products and prices:
   GET /buyer/products?shop_id=123&date=today
   
2. Review yesterday's inventory needs:
   - Event requirements for today
   - Regular business needs
   - Special occasion orders
   
3. Check credit status and available limit:
   GET /buyer/credits?status=all
   
4. Plan purchases based on budget and credit
```

### Shopping (9:00 AM - 12:00 PM)
```
1. Visit shop and inspect available stock
2. Compare quality and prices across farmers
3. Make purchase decisions:
   POST /buyer/purchase (immediate or credit)
   
4. Coordinate delivery if needed
5. Get receipts and documentation
6. Update personal inventory records
```

### Afternoon Operations (12:00 PM - 4:00 PM)
```
1. Use purchased products for business
2. Monitor product quality and performance
3. Note any issues for future reference
4. Plan evening/next day requirements
```

### Evening Review (4:00 PM - 7:00 PM)
```
1. Review day's purchases and expenses
2. Update accounting records
3. Plan payments for outstanding credits:
   GET /buyer/ledger?aging=true
   
4. Check payment due dates and amounts
5. Schedule payments based on cash flow
6. Plan next day's requirements
```

---

## Advanced Buyer Features

### Business Intelligence
- Spending pattern analysis
- Seasonal demand forecasting
- Supplier performance evaluation
- Price trend monitoring
- ROI analysis for different purchase strategies

### Mobile Features (Future)
- Mobile shopping app
- Real-time stock notifications
- Price alerts and comparisons
- Mobile payment integration
- Digital receipt management

### Integration Capabilities
- Accounting software connection
- Inventory management systems
- Event planning tools
- Customer billing integration
- Expense reporting automation

---

## Success Metrics for Buyers

### Financial KPIs
- Cost optimization achievements
- Credit utilization efficiency
- Payment timing optimization
- Supplier negotiation success
- ROI on product purchases

### Operational KPIs
- Purchase planning accuracy
- Quality satisfaction rates
- Supplier relationship strength
- Return/exchange percentages
- Inventory turnover optimization

### Relationship Metrics
- Supplier diversity management
- Credit limit utilization
- Payment reliability score
- Quality feedback ratings
- Long-term partnership value

This comprehensive feature set ensures buyers have complete control over their purchasing decisions while maintaining transparent relationships with suppliers and efficient financial management.
