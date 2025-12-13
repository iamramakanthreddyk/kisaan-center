# POST /payments

Create a payment record. This endpoint is used for both transaction-linked payments and standalone settlement payments (advances, refunds, etc.).
the problem is iwant you to fact check

a transaction made 

1000 goods sold

farmer paid 500 and pending 500 will go to his balance now will be +500

in payment smangement 
owner will select pay to farmer he will enter 500 
so balanc - paid amount = new balance 
500 - 500 = 0

next case farmer takkes advance of 1000
the balance will be negative 
now owner will slect receive the payment
then 
old balance + received amoun = new balance 
-1000 + 1000 = 0

i want this to work 

add this cases to this test, run it amke it work

Request body (JSON):

```json
{
  "transaction_id": 123,            // optional, when payment is tied to a transaction
  "payer_type": "SHOP|BUYER|FARMER",
  "payee_type": "SHOP|FARMER|BUYER",
  "amount": 1500.50,
  "method": "CASH|UPI|BANK_TRANSFER|CARD|OTHER",
  "status": "PAID",              // optional: PAID, PENDING, etc.
  "notes": "Optional note",
  "counterparty_id": 42,          // required for standalone settlement payments
  "shop_id": 1,                   // required to determine shop context
  "payment_date": "2025-10-20T10:00:00Z",
  "force_override": true          // optional flag: allow payments that would worsen farmer debt
}
```

Behavior notes:
- If `transaction_id` is present, payment allocation will prefer that transaction (direct allocation) and the transaction service will manage balance impacts.
- If `transaction_id` is null/missing, the payment is treated as a standalone settlement payment and the PaymentService will:
  - Allocate to outstanding transactions/expenses via FIFO where applicable.
  - Recalculate user balances and create a BalanceSnapshot capturing previous_balance, amount_change, new_balance.
  - Create a TransactionLedger entry recording delta_amount, balance_before, balance_after, and reason_code 'PAYMENT'.
- For Shop → Farmer payments that would worsen farmer debt, the server will run a guard check (`paymentGuard.willShopToFarmerWorsenDebt`). If the guard indicates the payment would worsen debt, the server will reject unless `force_override=true`.

Success response (200):

```json
{
  "success": true,
  "data": {
    "id": 987,
    "transaction_id": null,
    "payer_type": "SHOP",
    "payee_type": "FARMER",
    "amount": 1500.50,
    "status": "PAID",
    "payment_date": "2025-10-20T10:00:00Z",
    "method": "CASH",
    "notes": "Payment to farmer",
    "created_at": "2025-10-20T10:00:01Z",
    "applied_to_expenses": 200,
    "applied_to_balance": 1300,
    "fifo_result": {
      "settlements": [ { "expense_id": 12, "amount_settled": 200 } ],
      "remaining": 1300
    }
  }
}
```

Error response (400/409):

```json
{ "success": false, "message": "Payment would worsen farmer debt from -2000 to -3500. Use force_override=true to proceed." }
```

Notes for frontend:
- Include `force_override` only when user has explicitly chosen to allow it (override checkbox). The server will re-check it and can still reject if logic differs.
- Do not assume the server will add extra fields such as `created_by`; audit is handled server-side using the authenticated user id.

Examples:
- Pay farmer (shop → farmer): payer_type=SHOP, payee_type=FARMER
- Receive from buyer (buyer → shop): payer_type=BUYER, payee_type=SHOP
- Receive from farmer (farmer → shop): payer_type=FARMER, payee_type=SHOP

---

Reference: PaymentService.createPayment in backend (enforces guard, applies FIFO, writes ledger and snapshots)
