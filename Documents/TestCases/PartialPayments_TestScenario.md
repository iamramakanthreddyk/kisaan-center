# KisaanCenter Scenario: Partial Payments, Multiple Products, Multiple Buyers

## Scenario Description
A farmer delivers multiple types of flowers to a shop. Throughout the day, several buyers purchase different products. Some buyers pay only part of their bill immediately, with the rest pending as credit. The farmer receives a partial payment from the shop, not the full amount owed for the day.

## Example Walkthrough
### Day 1
- **Farmer A delivers:**
  - Roses: ₹600 worth
  - Marigold: ₹400 worth
  - **Total delivered:** ₹1,000

- **Buyer 1 purchases:**
  - Roses: ₹400
  - Marigold: ₹200
  - **Total:** ₹600
  - **Pays:** ₹300 (₹300 pending as credit)

- **Buyer 2 purchases:**
  - Roses: ₹200
  - Marigold: ₹200
  - **Total:** ₹400
  - **Pays:** ₹200 (₹200 pending as credit)

- **End of Day Summary:**
  - **Total sold:** ₹1,000
  - **Total received from buyers:** ₹500
  - **Total pending from buyers:** ₹500

- **Farmer Payment:**
  - Shop pays Farmer A: ₹800 (not full ₹1,000)
  - **₹200 still owed to Farmer A** (to be paid when buyers pay remaining credit)

### Day 2 and Beyond
- Buyers return and pay off their credit.
- Shop receives pending payments.
- Shop pays Farmer A the remaining ₹200.

## Multiple Products & Buyers
- The system tracks each product, buyer, and payment status separately.
- Farmer A can deliver multiple products (roses, marigold, jasmine, etc.)
- Multiple buyers can purchase any combination of products, with each transaction recorded.
- Each buyer’s payment status (paid, credit) is tracked.
- Farmer’s total owed is calculated based on all products sold and payments received.
- Partial payments to farmers are supported; remaining amounts are tracked until fully paid.

## Testing Checklist
- [ ] Can record multiple products delivered by a farmer in a day.
- [ ] Can record multiple buyers purchasing different products.
- [ ] Can record partial payments from buyers (credit).
- [ ] Can pay farmer a partial amount, with remaining owed tracked.
- [ ] Can update payment status as buyers pay off credit.
- [ ] Can handle this scenario over multiple days.
- [ ] Can generate reports showing pending payments to farmers and from buyers.

---

This scenario is fully supported by the KisaanCenter data model and workflow. Use this example to test the implementation and ensure all edge cases are handled correctly.
