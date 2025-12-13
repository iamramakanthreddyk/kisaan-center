# Transaction Flow & Derived Fields

## Overview
This document explains how a transaction is created on the frontend, which fields are derived, and how data is transmitted to the backend. It ensures everyone uses the same calculation logic and avoids silent divergence.

## Key Components
- Builder: `utils/buildTransactionPayload.ts`
- Calculations: `features/transactions/utils/transactionCalculations.ts`
- Service: `transactionsApi.createFromInput` in `services/api.ts`
- Endpoints: `TRANSACTION_ENDPOINTS.BASE` for create / fetch; earnings & list endpoints for aggregates and filtered views.

## Raw Form Inputs (Typical)
```
shop_id
farmer_id
buyer_id
product_id
quantity
unit_price
commission_rate  (percentage, e.g., 5 for 5%)
transaction_date (ISO string or date)
notes (optional)
```

## Derived Fields (Computed, NOT entered manually)
| Field | Formula | Notes |
|-------|---------|-------|
| total_sale_value | quantity * unit_price | Rounded to 2 decimals. |
| shop_commission | total_sale_value * (commission_rate / 100) | Commission rate treated as percent. Rounded 2 decimals. |
| farmer_earning | total_sale_value - shop_commission | Rounded 2 decimals; guard against negative via Math.max(.,0). |

All rounding uses a helper (consistent decimal fix) to avoid floating drift between UI and backend.

## Calculation Source of Truth
Never perform ad-hoc math in components. Always rely on:
- `transactionCalculations.ts` for pure arithmetic.
- `buildTransactionPayload.ts` for assembling the final object.

## Payload Assembly
1. Sanitize numeric fields (coerce strings to numbers, default 0 where necessary).
2. Normalize commission_rate to a numeric percentage (e.g., '5' → 5).
3. Compute derived monetary values.
4. Output final object with shape expected by backend (includes derived fields explicitly to satisfy NOT NULL constraints).

## Example
Input:
```ts
{
  shop_id: 10,
  farmer_id: 4,
  buyer_id: 22,
  product_id: 7,
  quantity: 120,
  unit_price: 14.5,
  commission_rate: 5,
  transaction_date: '2025-09-22T10:02:00Z'
}
```
Derived & Payload:
```ts
{
  shop_id: 10,
  farmer_id: 4,
  buyer_id: 22,
  product_id: 7,
  quantity: 120,
  unit_price: 14.5,
  commission_rate: 5,
  total_sale_value: 1740,
  shop_commission: 87,
  farmer_earning: 1653,
  transaction_date: '2025-09-22T10:02:00Z'
}
```

## Error Handling & Validation
- Frontend should validate presence of required base fields (shop_id, farmer_id, buyer_id, quantity > 0, unit_price >= 0).
- Commission rate default (if omitted) can be 0; builder ensures numbers.
- If NaN encountered, builder coerces to 0 and still produces consistent derived numbers (defensive design). Consider stricter validation upstream for UX.

## Earnings & Aggregation Endpoints
| Purpose | Endpoint Constant | Description |
|---------|-------------------|-------------|
| Shop earnings summary | `TRANSACTION_ENDPOINTS.SHOP_EARNINGS(shopId)` | Summaries for a shop. |
| Farmer earnings summary | `TRANSACTION_ENDPOINTS.FARMER_EARNINGS(farmerId)` | Farmer-specific totals. |
| Buyer purchases list | `TRANSACTION_ENDPOINTS.BUYER_PURCHASES(buyerId)` | Purchases referencing buyer. |
| Shop transactions list | `TRANSACTION_ENDPOINTS.SHOP_BASE(shopId)` (list variant may paginate) | Raw transactions for a shop. |

## Consistency Guarantees
- All monetary values represented as numbers (no localized formatting) until presentation layer.
- Any report/export should reuse the already-derived values; no recalculation duplication.

## Future Enhancements
- Introduce schema validation (zod or io-ts) around payload builder for tighter runtime safety.
- Localize currency formatting at render time using a shared formatter utility.
- Add unit tests verifying rounding and edge cases (very large quantities, zero commission, fractional commission_rate like 2.75).

## Edge Cases Considered
| Case | Strategy |
|------|----------|
| commission_rate undefined | Assume 0. | 
| quantity or unit_price string | Coerced via Number(); if NaN → 0. |
| Negative intermediate due to floating precision | Rounding early & Math.max for farmer_earning. |
| Large numbers (overflow risk low) | Standard JS number okay; consider BigInt only if business scales drastically. |

## References
- Architecture Overview: `FRONTEND_ARCHITECTURE.md`
- Endpoints map: `services/endpoints.ts`
- Service layer: `services/api.ts`
- Helpers: `services/serviceHelpers.ts`
- Store caching: `store/transactionStore.ts`

