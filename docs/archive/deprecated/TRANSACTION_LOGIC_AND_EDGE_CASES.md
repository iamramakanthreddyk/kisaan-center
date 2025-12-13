# KisaanCenter Transaction Logic & Edge Cases

## Key Transaction Fields

| Field             | Description                                                      |
|-------------------|------------------------------------------------------------------|
| shop_id           | Shop where transaction occurred                                  |
| farmer_id         | Seller (farmer)                                                  |
| buyer_id          | Buyer                                                            |
| product_id        | Product sold                                                     |
| quantity          | Amount sold (e.g., 10 kg)                                        |
| price             | Price per unit (e.g., ₹100/kg)                                   |
| total             | Sale value (quantity × price, e.g., ₹1000)                       |
| commission_rate   | % commission (from shop table, e.g., 10%)                        |
| commission_amount | Calculated (total × commission_rate)                             |
| farmer_paid       | Amount paid to farmer (input by owner, e.g., ₹900)               |
| buyer_paid        | Amount received from buyer (input by owner, e.g., ₹500)          |
| deficit           | Amount still to be collected from buyer (total - buyer_paid)      |
| status            | 'paid', 'partial', 'credit', 'farmer_due', etc.                  |
| transaction_date  | Date of transaction                                              |

---

## Edge Cases & Status Logic

### 1. Farmer Paid in Full, Buyer Paid Partial
- **Example:** Sale ₹1000, Commission ₹100, Farmer paid ₹900, Buyer paid ₹500
- **Deficit:** ₹500 (to be collected from buyer)
- **Status:** 'partial' or 'credit'

### 2. Farmer Paid in Full, Buyer Paid in Full
- **Example:** Sale ₹1000, Commission ₹100, Farmer paid ₹900, Buyer paid ₹1000
- **Deficit:** ₹0
- **Status:** 'paid'

### 3. Farmer Paid Partial, Buyer Paid Partial
- **Example:** Sale ₹1000, Commission ₹100, Farmer paid ₹500, Buyer paid ₹500
- **Deficit:** ₹500
- **Status:** 'partial'

### 4. Farmer Not Paid, Buyer Paid in Full
- **Example:** Sale ₹1000, Commission ₹100, Farmer paid ₹0, Buyer paid ₹1000
- **Deficit:** ₹0
- **Status:** 'farmer_due'

### 5. Farmer Paid, Buyer Not Paid
- **Example:** Sale ₹1000, Commission ₹100, Farmer paid ₹900, Buyer paid ₹0
- **Deficit:** ₹1000
- **Status:** 'credit'

---

## Status Calculation

- **If status is not set by owner, backend should auto-calculate:**
    - If `buyer_paid` == `total` and `farmer_paid` == (`total` - `commission_amount`): **'paid'**
    - If `buyer_paid` < `total` and `farmer_paid` == (`total` - `commission_amount`): **'partial'**
    - If `buyer_paid` == 0: **'credit'**
    - If `farmer_paid` < (`total` - `commission_amount`): **'farmer_due'**
    - Otherwise: **'partial'**

---

## Commission Rate

- **Always comes from the shop table** (not input per transaction).

---

## Analytics for Owner

- **Total sales value**: sum of `total`
- **Total commission**: sum of `commission_amount`
- **Total received from buyers**: sum of `buyer_paid`
- **Total paid to farmers**: sum of `farmer_paid`
- **Total deficit**: sum of `deficit`
- **Filter by**: status, farmer, buyer, product, date

---

## Filtering

- Owner can filter transactions by:
    - Date range
    - Farmer
    - Buyer
    - Product
    - Status (paid, partial, credit, farmer_due, etc.)

---

## Notes

- `commission_rate` is always fetched from the shop table for each transaction.
- `status` can be set by owner, but if not provided, backend must calculate it using the above logic.
- All calculations (commission, deficit, etc.) should be performed in backend for consistency.

---

**Keep this documentation in your codebase for future reference and onboarding.**
